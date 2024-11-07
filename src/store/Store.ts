import { makeAutoObservable } from 'mobx';
import { fabric } from 'fabric';
import { getUid, isHtmlAudioElement, isHtmlImageElement, isHtmlVideoElement } from '@/utils';
import anime, { get } from 'animejs';
import { MenuOption, EditorElement, Animation, TimeFrame, VideoEditorElement, AudioEditorElement, Placement, ImageEditorElement, Effect, TextEditorElement } from '../types';
import { FabricUitls } from '@/utils/fabric-utils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { getClipTopic } from '@/utils/gpt-utils';

interface VideoResource {
  url: string;
  fileName: string;
  size?: number;
  dateAdded?: number;
  duration?: number;
}

interface ResourceMetadata {
  size: number;
  dateAdded: number;
  duration?: number;
}

interface MediaResource extends VideoResource {
  size: number;
  dateAdded: number;
}

interface VideoGroup {
  id: string;
  name: string;
  videos: string[];
}

interface Timeline {
  id: string;
  name: string;
  elements: EditorElement[];
  duration: number;
}

export class Store {
  canvas: fabric.Canvas | null

  backgroundColor: string;

  selectedMenuOption: MenuOption;
  audios: MediaResource[]
  videos: MediaResource[]
  images: MediaResource[]
  editorElements: EditorElement[]
  selectedElement: EditorElement | null;

  maxTime: number
  animations: Animation[]
  animationTimeLine: anime.AnimeTimelineInstance;
  playing: boolean;

  currentKeyFrame: number;
  fps: number;

  possibleVideoFormats: string[] = ['mp4', 'webm'];
  selectedVideoFormat: 'mp4' | 'webm';

  videoGroups: VideoGroup[];

  timelines: Timeline[];
  activeTimelineId: string | null;

  constructor() {
    this.canvas = null;
    this.videos = [];
    this.images = [];
    this.audios = [];
    this.editorElements = [];
    this.backgroundColor = '#111111';
    this.maxTime = 0;
    this.playing = false;
    this.currentKeyFrame = 0;
    this.selectedElement = null;
    this.fps = 60;
    this.animations = [];
    this.animationTimeLine = anime.timeline();
    this.selectedMenuOption = 'Video';
    this.selectedVideoFormat = 'mp4';
    this.videoGroups = [];
    this.possibleVideoFormats = ['mp4', 'webm'];
    this.timelines = [];
    this.activeTimelineId = null;
    makeAutoObservable(this);
  }

    // AI Features

  get currentTimeInMs() {
    return this.currentKeyFrame * 1000 / this.fps;
  }

  setCurrentTimeInMs = (time: number) => {
    this.currentKeyFrame = Math.floor(time / 1000 * this.fps);
  }

  setSelectedMenuOption = (selectedMenuOption: MenuOption) => {
    this.selectedMenuOption = selectedMenuOption;
  }

  setCanvas = (canvas: fabric.Canvas | null) => {
    this.canvas = canvas;
    if (canvas) {
      canvas.backgroundColor = this.backgroundColor;
    }
  }

  setBackgroundColor = (backgroundColor: string) => {
    this.backgroundColor = backgroundColor;
    if (this.canvas) {
      this.canvas.backgroundColor = backgroundColor;
    }
  }

  updateEffect = (id: string, effect: Effect) => {
    const index = this.editorElements.findIndex((element) => element.id === id);
    const element = this.editorElements[index];
    if (isEditorVideoElement(element) || isEditorImageElement(element)) {
      element.properties.effect = effect;
    }
    this.refreshElements();
  }

  setVideos = (videos: VideoResource[]) => {
    this.videos = videos.map(video => ({
        ...video,
        size: video.size ?? 0,
        dateAdded: video.dateAdded ?? Date.now()
    }));
  }

  addVideoResource = (url: string, fileName: string, metadata: ResourceMetadata) => {
    this.videos.push({
      url,
      fileName,
      size: metadata.size,
      dateAdded: metadata.dateAdded,
      duration: metadata.duration
    });
  }

  addImageResource = (url: string, fileName: string, metadata: ResourceMetadata) => {
    this.images.push({
      url,
      fileName,
      size: metadata.size,
      dateAdded: metadata.dateAdded
    });
  }

  addAudioResource = (url: string, fileName: string, metadata: ResourceMetadata) => {
    this.audios.push({
      url,
      fileName,
      size: metadata.size,
      dateAdded: metadata.dateAdded,
      duration: metadata.duration
    });
  }

  addAnimation = (animation: Animation) => {
    this.animations = [...this.animations, animation];
    this.refreshAnimations();
  }

  updateAnimation = (id: string, animation: Animation) => {
    const index = this.animations.findIndex((a) => a.id === id);
    this.animations[index] = animation;
    this.refreshAnimations();
  }

  refreshAnimations = () => {
    anime.remove(this.animationTimeLine);
    this.animationTimeLine = anime.timeline({
      duration: this.maxTime,
      autoplay: false,
    });
    for (let i = 0; i < this.animations.length; i++) {
      const animation = this.animations[i];
      const editorElement = this.editorElements.find((element) => element.id === animation.targetId);
      const fabricObject = editorElement?.fabricObject;
      if (!editorElement || !fabricObject) {
        continue;
      }
      fabricObject.clipPath = undefined;
      switch (animation.type) {
        case "fadeIn": {
          this.animationTimeLine.add({
            opacity: [0, 1],
            duration: animation.duration,
            targets: fabricObject,
            easing: 'linear',
          }, editorElement.timeFrame.start);
          break;
        }
        case "fadeOut": {
          this.animationTimeLine.add({
            opacity: [1, 0],
            duration: animation.duration,
            targets: fabricObject,
            easing: 'linear',
          }, editorElement.timeFrame.end - animation.duration);
          break
        }
        case "slideIn": {
          const direction = animation.properties.direction;
          const targetPosition = {
            left: editorElement.placement.x,
            top: editorElement.placement.y,
          }
          const startPosition = {
            left: (direction === "left" ? - editorElement.placement.width : direction === "right" ? this.canvas?.width : editorElement.placement.x),
            top: (direction === "top" ? - editorElement.placement.height : direction === "bottom" ? this.canvas?.height : editorElement.placement.y),
          }
          if (animation.properties.useClipPath) {
            const clipRectangle = FabricUitls.getClipMaskRect(editorElement, 50);
            fabricObject.set('clipPath', clipRectangle)
          }
          if (editorElement.type === "text" && animation.properties.textType === "character") {
            this.canvas?.remove(...editorElement.properties.splittedTexts)
            // @ts-ignore
            editorElement.properties.splittedTexts = getTextObjectsPartitionedByCharacters(editorElement.fabricObject, editorElement);
            editorElement.properties.splittedTexts.forEach((textObject) => {
              this.canvas!.add(textObject);
            })
            const duration = animation.duration / 2;
            const delay = duration / editorElement.properties.splittedTexts.length;
            for (let i = 0; i < editorElement.properties.splittedTexts.length; i++) {
              const splittedText = editorElement.properties.splittedTexts[i];
              const offset = {
                left: splittedText.left! - editorElement.placement.x,
                top: splittedText.top! - editorElement.placement.y
              }
              this.animationTimeLine.add({
                left: [startPosition.left! + offset.left, targetPosition.left + offset.left],
                top: [startPosition.top! + offset.top, targetPosition.top + offset.top],
                delay: i * delay,
                duration: duration,
                targets: splittedText,
              }, editorElement.timeFrame.start);
            }
            this.animationTimeLine.add({
              opacity: [1, 0],
              duration: 1,
              targets: fabricObject,
              easing: 'linear',
            }, editorElement.timeFrame.start);
            this.animationTimeLine.add({
              opacity: [0, 1],
              duration: 1,
              targets: fabricObject,
              easing: 'linear',
            }, editorElement.timeFrame.start + animation.duration);

            this.animationTimeLine.add({
              opacity: [0, 1],
              duration: 1,
              targets: editorElement.properties.splittedTexts,
              easing: 'linear',
            }, editorElement.timeFrame.start);
            this.animationTimeLine.add({
              opacity: [1, 0],
              duration: 1,
              targets: editorElement.properties.splittedTexts,
              easing: 'linear',
            }, editorElement.timeFrame.start + animation.duration);
          }
          this.animationTimeLine.add({
            left: [startPosition.left, targetPosition.left],
            top: [startPosition.top, targetPosition.top],
            duration: animation.duration,
            targets: fabricObject,
            easing: 'linear',
          }, editorElement.timeFrame.start);
          break
        }
        case "slideOut": {
          const direction = animation.properties.direction;
          const startPosition = {
            left: editorElement.placement.x,
            top: editorElement.placement.y,
          }
          const targetPosition = {
            left: (direction === "left" ? - editorElement.placement.width : direction === "right" ? this.canvas?.width : editorElement.placement.x),
            top: (direction === "top" ? -100 - editorElement.placement.height : direction === "bottom" ? this.canvas?.height : editorElement.placement.y),
          }
          if (animation.properties.useClipPath) {
            const clipRectangle = FabricUitls.getClipMaskRect(editorElement, 50);
            fabricObject.set('clipPath', clipRectangle)
          }
          this.animationTimeLine.add({
            left: [startPosition.left, targetPosition.left],
            top: [startPosition.top, targetPosition.top],
            duration: animation.duration,
            targets: fabricObject,
            easing: 'linear',
          }, editorElement.timeFrame.end - animation.duration);
          break
        }
        case "breathe": {
          const itsSlideInAnimation = this.animations.find((a) => a.targetId === animation.targetId && (a.type === "slideIn"));
          const itsSlideOutAnimation = this.animations.find((a) => a.targetId === animation.targetId && (a.type === "slideOut"));
          const timeEndOfSlideIn = itsSlideInAnimation ? editorElement.timeFrame.start + itsSlideInAnimation.duration : editorElement.timeFrame.start;
          const timeStartOfSlideOut = itsSlideOutAnimation ? editorElement.timeFrame.end - itsSlideOutAnimation.duration : editorElement.timeFrame.end;
          if (timeEndOfSlideIn > timeStartOfSlideOut) {
            continue;
          }
          const duration = timeStartOfSlideOut - timeEndOfSlideIn;
          const easeFactor = 4;
          const suitableTimeForHeartbeat = 1000 * 60 / 72 * easeFactor
          const upScale = 1.05;
          const currentScaleX = fabricObject.scaleX ?? 1;
          const currentScaleY = fabricObject.scaleY ?? 1;
          const finalScaleX = currentScaleX * upScale;
          const finalScaleY = currentScaleY * upScale;
          const totalHeartbeats = Math.floor(duration / suitableTimeForHeartbeat);
          if (totalHeartbeats < 1) {
            continue;
          }
          const keyframes = [];
          for (let i = 0; i < totalHeartbeats; i++) {
            keyframes.push({ scaleX: finalScaleX, scaleY: finalScaleY });
            keyframes.push({ scaleX: currentScaleX, scaleY: currentScaleY });
          }

          this.animationTimeLine.add({
            duration: duration,
            targets: fabricObject,
            keyframes,
            easing: 'linear',
            loop: true
          }, timeEndOfSlideIn);

          break
        }
      }
    }
  }

  removeAnimation = (id: string) => {
    this.animations = this.animations.filter(
      (animation) => animation.id !== id
    );
    this.refreshAnimations();
  }

  setSelectedElement = (selectedElement: EditorElement | null) => {
    this.selectedElement = selectedElement;
    if (this.canvas) {
      if (selectedElement?.fabricObject)
        this.canvas.setActiveObject(selectedElement.fabricObject);
      else
        this.canvas.discardActiveObject();
    }
  }

  updateSelectedElement = () => {
    this.selectedElement = this.editorElements.find((element) => element.id === this.selectedElement?.id) ?? null;
  }

  setEditorElements = (editorElements: EditorElement[]) => {
    this.editorElements = editorElements;
    this.updateSelectedElement();
    this.refreshElements();
    // this.refreshAnimations();
  }

  updateEditorElement = (editorElement: EditorElement) => {
    this.setEditorElements(this.editorElements.map((element) =>
      element.id === editorElement.id ? editorElement : element
    ));
  }

  updateEditorElementTimeFrame = (editorElement: EditorElement, timeFrame: Partial<TimeFrame>) => {
    if (timeFrame.start != undefined && timeFrame.start < 0) {
      timeFrame.start = 0;
    }
    if (timeFrame.end != undefined && timeFrame.end > this.maxTime) {
      timeFrame.end = this.maxTime;
    }
    const newEditorElement = {
      ...editorElement,
      timeFrame: {
        ...editorElement.timeFrame,
        ...timeFrame,
      }
    }
    this.updateVideoElements();
    this.updateAudioElements();
    this.updateEditorElement(newEditorElement);
    this.refreshAnimations();
  }


  addEditorElement = (editorElement: EditorElement) => {
    if (!this.activeTimelineId) {
      this.createTimeline("Timeline 1");
    }
    
    const timeline = this.timelines.find(t => t.id === this.activeTimelineId);
    if (timeline) {
      timeline.elements.push(editorElement);
      this.editorElements = timeline.elements;
      this.refreshElements();
      this.setSelectedElement(this.editorElements[this.editorElements.length - 1]);
    }
  }

  removeEditorElement = (id: string) => {
    this.setEditorElements(this.editorElements.filter(
      (editorElement) => editorElement.id !== id
    ));
    this.refreshElements();
  }

  setMaxTime = (maxTime: number) => {
    const maxEndTime = Math.max(
      maxTime,
      ...this.editorElements.map(element => element.timeFrame.end)
    );
    this.maxTime = maxEndTime;
  }


  setPlaying = (playing: boolean) => {
    this.playing = playing;
    this.updateVideoElements();
    this.updateAudioElements();
    if (playing) {
      this.startedTime = Date.now();
      this.startedTimePlay = this.currentTimeInMs
      requestAnimationFrame(() => {
        this.playFrames();
      });
    }
  }

  startedTime = 0;
  startedTimePlay = 0;

  playFrames = () => {
    if (!this.playing) {
      return;
    }
    const elapsedTime = Date.now() - this.startedTime;
    const newTime = this.startedTimePlay + elapsedTime;
    
    // Loop back to start if we reach the end
    if (newTime >= this.maxTime) {
      this.currentKeyFrame = 0;
      this.startedTime = Date.now();
      this.startedTimePlay = 0;
      this.updateTimeTo(0);
    } else {
      this.updateTimeTo(newTime);
    }
    
    requestAnimationFrame(() => {
      this.playFrames();
    });
  }

  updateTimeTo = (newTime: number) => {
    this.setCurrentTimeInMs(newTime);
    this.animationTimeLine.seek(newTime);
    if (this.canvas) {
      this.canvas.backgroundColor = this.backgroundColor;
    }
    this.editorElements.forEach(
      e => {
        if (!e.fabricObject) return;
        const isInside = e.timeFrame.start <= newTime && newTime <= e.timeFrame.end;
        e.fabricObject.visible = isInside;
      }
    )
  }

  handleSeek = (seek: number) => {
    if (this.playing) {
      this.setPlaying(false);
    }
    this.updateTimeTo(seek);
    this.updateVideoElements();
    this.updateAudioElements();
  }

  addVideo = (index: number) => {
    const videoElement = document.getElementById(`video-${index}`)
    if (!isHtmlVideoElement(videoElement)) {
      return;
    }

    // Wait for video metadata to load
    if (!videoElement.duration) {
      videoElement.addEventListener('loadedmetadata', () => this.addVideo(index));
      return;
    }

    const videoDurationMs = Math.round(videoElement.duration * 1000);
    
    // Set maxTime to video duration
    this.maxTime = videoDurationMs;

    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const id = getUid();

    const videoResource = this.videos[index];
    const videoName = videoResource?.fileName || `Video ${index + 1}`;

    this.addEditorElement({
      id,
      name: videoName,
      type: "video",
      placement: {
        x: 0,
        y: 0,
        width: 100 * aspectRatio,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      timeFrame: {
        start: 0,
        end: videoDurationMs,
      },
      properties: {
        elementId: `video-${id}`,
        src: videoElement.src,
        effect: {
          type: "none",
        }
      },
    });
  }

  addImage = (index: number) => {
    const imageElement = document.getElementById(`image-${index}`)
    if (!isHtmlImageElement(imageElement)) {
      return;
    }
    const aspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
    const id = getUid();

    // Get the image resource to access the real filename
    const imageResource = this.images[index];
    const imageName = imageResource?.fileName || `Image ${index + 1}`;

    this.addEditorElement(
      {
        id,
        name: imageName,
        type: "image",
        placement: {
          x: 0,
          y: 0,
          width: 100 * aspectRatio,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
        timeFrame: {
          start: 0,
          end: this.maxTime,
        },
        properties: {
          elementId: `image-${id}`,
          src: imageElement.src,
          effect: {
            type: "none",
          }
        },
      },
    );
  }

  addAudio = (index: number) => {
    const audioElement = document.getElementById(`audio-${index}`)
    if (!isHtmlAudioElement(audioElement)) {
      return;
    }
    const audioDurationMs = audioElement.duration * 1000;
    const id = getUid();

    // Get the audio resource to access the real filename
    const audioResource = this.audios[index];
    const audioName = audioResource?.fileName || `Audio ${index + 1}`;

    this.addEditorElement(
      {
        id,
        name: audioName,
        type: "audio",
        placement: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
        timeFrame: {
          start: 0,
          end: audioDurationMs,
        },
        properties: {
          elementId: `audio-${id}`,
          src: audioElement.src,
        }
      },
    );
  }

  addText = (options: {
    text: string,
    fontSize: number,
    fontWeight: number,
  }) => {
    const id = getUid();
    const index = this.editorElements.length;
    this.addEditorElement(
      {
        id,
        name: `Text ${index + 1}`,
        type: "text",
        placement: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
        timeFrame: {
          start: 0,
          end: this.maxTime,
        },
        properties: {
          text: options.text,
          fontSize: options.fontSize,
          fontWeight: options.fontWeight,
          splittedTexts: [],
        },
      },
    );
  }

  updateVideoElements = () => {
    this.editorElements.filter(
      (element): element is VideoEditorElement =>
        element.type === "video"
    )
      .forEach((element) => {
        const video = document.getElementById(element.properties.elementId);
        if (isHtmlVideoElement(video)) {
          const videoTime = (this.currentTimeInMs - element.timeFrame.start) / 1000;
          video.currentTime = videoTime;
          if (this.playing) {
            video.play();
          } else {
            video.pause();
          }
        }
      })
  }

  updateAudioElements = () => {
    this.editorElements.filter(
      (element): element is AudioEditorElement =>
        element.type === "audio"
    )
      .forEach((element) => {
        const audio = document.getElementById(element.properties.elementId);
        if (isHtmlAudioElement(audio)) {
          const audioTime = (this.currentTimeInMs - element.timeFrame.start) / 1000;
          audio.currentTime = audioTime;
          if (this.playing) {
            audio.play();
          } else {
            audio.pause();
          }
        }
      })
  }

  setVideoFormat = (format: 'mp4' | 'webm') => {
    this.selectedVideoFormat = format;
  }

  saveCanvasToVideoWithAudio = () => {
    this.saveCanvasToVideoWithAudioWebmMp4();
  }

  saveCanvasToVideoWithAudioWebmMp4 = () => {
    console.log('modified')
    let mp4 = this.selectedVideoFormat === 'mp4'
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const stream = canvas.captureStream(30);
    const audioElements = this.editorElements.filter(isEditorAudioElement)
    const audioStreams: MediaStream[] = [];
    audioElements.forEach((audio) => {
      const audioElement = document.getElementById(audio.properties.elementId) as HTMLAudioElement;
      let ctx = new AudioContext();
      let sourceNode = ctx.createMediaElementSource(audioElement);
      let dest = ctx.createMediaStreamDestination();
      sourceNode.connect(dest);
      sourceNode.connect(ctx.destination);
      audioStreams.push(dest.stream);
    });
    audioStreams.forEach((audioStream) => {
      stream.addTrack(audioStream.getAudioTracks()[0]);
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.height = 500;
    video.width = 800;
    // video.controls = true;
    // document.body.appendChild(video);
    video.play().then(() => {
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = function (e) {
        chunks.push(e.data);
        console.log("data available");

      };
      mediaRecorder.onstop = async function (e) {
        const blob = new Blob(chunks, { type: "video/webm" });

        if (mp4) {
          // lets use ffmpeg to convert webm to mp4
          const data = new Uint8Array(await (blob).arrayBuffer());
          const ffmpeg = new FFmpeg();
          const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd"
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            // workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
          });
          await ffmpeg.writeFile('video.webm', data);
          await ffmpeg.exec(["-y", "-i", "video.webm", "-c", "copy", "video.mp4"]);
          // await ffmpeg.exec(["-y", "-i", "video.webm", "-c:v", "libx264", "video.mp4"]);

          const output = await ffmpeg.readFile('video.mp4');
          const outputBlob = new Blob([output], { type: "video/mp4" });
          const outputUrl = URL.createObjectURL(outputBlob);
          const a = document.createElement("a");
          a.download = "video.mp4";
          a.href = outputUrl;
          a.click();

        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "video.webm";
          a.click();
        }
      };
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, this.maxTime);
      video.remove();
    })
  }

  refreshElements = () => {
    const store = this;
    if (!store.canvas) return;
    const canvas = store.canvas;
    store.canvas.remove(...store.canvas.getObjects());
    for (let index = 0; index < store.editorElements.length; index++) {
      const element = store.editorElements[index];
      switch (element.type) {
        case "video": {
          console.log("elementid", element.properties.elementId);
          if (document.getElementById(element.properties.elementId) == null)
            continue;
          const videoElement = document.getElementById(
            element.properties.elementId
          );
          if (!isHtmlVideoElement(videoElement)) continue;
          
          const videoObject = new fabric.CoverVideo(videoElement, {
            name: element.id,
            left: 0,
            top: 0,
            width: canvas.width ?? 800,
            height: canvas.height ?? 500,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            hasBorders: false,
            // @ts-ignore
            customFilter: element.properties.effect.type,
          });

          element.fabricObject = videoObject;
          element.properties.imageObject = videoObject;
          
          if (canvas.width) videoElement.width = canvas.width;
          if (canvas.height) videoElement.height = canvas.height;
          
          canvas.add(videoObject);
          
          videoObject.center();
          canvas.renderAll();
          break;
        }
        case "image": {
          if (document.getElementById(element.properties.elementId) == null)
            continue;
          const imageElement = document.getElementById(
            element.properties.elementId
          );
          if (!isHtmlImageElement(imageElement)) continue;
          // const filters = [];
          // if (element.properties.effect?.type === "blackAndWhite") {
          //   filters.push(new fabric.Image.filters.Grayscale());
          // }
          const imageObject = new fabric.CoverImage(imageElement, {
            name: element.id,
            left: element.placement.x,
            top: element.placement.y,
            angle: element.placement.rotation,
            objectCaching: false,
            selectable: true,
            lockUniScaling: true,
            // filters
            // @ts-ignore
            customFilter: element.properties.effect.type,
          });
          // imageObject.applyFilters();
          element.fabricObject = imageObject;
          element.properties.imageObject = imageObject;
          const image = {
            w: imageElement.naturalWidth,
            h: imageElement.naturalHeight,
          };

          imageObject.width = image.w;
          imageObject.height = image.h;
          imageElement.width = image.w;
          imageElement.height = image.h;
          imageObject.scaleToHeight(image.w);
          imageObject.scaleToWidth(image.h);
          const toScale = {
            x: element.placement.width / image.w,
            y: element.placement.height / image.h,
          };
          imageObject.scaleX = toScale.x * element.placement.scaleX;
          imageObject.scaleY = toScale.y * element.placement.scaleY;
          canvas.add(imageObject);
          canvas.on("object:modified", function (e) {
            if (!e.target) return;
            const target = e.target;
            if (target != imageObject) return;
            const placement = element.placement;
            let fianlScale = 1;
            if (target.scaleX && target.scaleX > 0) {
              fianlScale = target.scaleX / toScale.x;
            }
            const newPlacement: Placement = {
              ...placement,
              x: target.left ?? placement.x,
              y: target.top ?? placement.y,
              rotation: target.angle ?? placement.rotation,
              scaleX: fianlScale,
              scaleY: fianlScale,
            };
            const newElement = {
              ...element,
              placement: newPlacement,
            };
            store.updateEditorElement(newElement);
          });
          break;
        }
        case "audio": {
          break;
        }
        case "text": {
          const textObject = new fabric.Textbox(element.properties.text, {
            name: element.id,
            left: element.placement.x,
            top: element.placement.y,
            scaleX: element.placement.scaleX,
            scaleY: element.placement.scaleY,
            width: element.placement.width,
            height: element.placement.height,
            angle: element.placement.rotation,
            fontSize: element.properties.fontSize,
            fontWeight: element.properties.fontWeight,
            objectCaching: false,
            selectable: true,
            lockUniScaling: true,
            fill: "#ffffff",
          });
          element.fabricObject = textObject;
          canvas.add(textObject);
          canvas.on("object:modified", function (e) {
            if (!e.target) return;
            const target = e.target;
            if (target != textObject) return;
            const placement = element.placement;
            const newPlacement: Placement = {
              ...placement,
              x: target.left ?? placement.x,
              y: target.top ?? placement.y,
              rotation: target.angle ?? placement.rotation,
              width: target.width ?? placement.width,
              height: target.height ?? placement.height,
              scaleX: target.scaleX ?? placement.scaleX,
              scaleY: target.scaleY ?? placement.scaleY,
            };
            const newElement = {
              ...element,
              placement: newPlacement,
              properties: {
                ...element.properties,
                // @ts-ignore
                text: target?.text,
              },
            };
            store.updateEditorElement(newElement);
          });
          break;
        }
        default: {
          throw new Error("Not implemented");
        }
      }
      if (element.fabricObject) {
        element.fabricObject.on("selected", function (e) {
          store.setSelectedElement(element);
        });
      }
    }
    const selectedEditorElement = store.selectedElement;
    if (selectedEditorElement && selectedEditorElement.fabricObject) {
      canvas.setActiveObject(selectedEditorElement.fabricObject);
    }
    this.refreshAnimations();
    this.updateTimeTo(this.currentTimeInMs);
    store.canvas.renderAll();
  }

  async sortClipsByTopic() {
    const topicsMap: Record<string, EditorElement[]> = {};

    for (const element of this.editorElements) {
      if (element.type === "video") {
        const topic = await getClipTopic([element.properties.src]);
        if (!topicsMap[topic]) {
          topicsMap[topic] = [];
        }
        topicsMap[topic].push(element);
      }
    }

    this.editorElements = Object.values(topicsMap).flat();
  }

  async generateGroupName(videos: string[]): Promise<string> {
    try {
      // Get the stored file names and ensure it's valid
      const storedFileNames = JSON.parse(window.sessionStorage.getItem('uploadedFileNames') || '[]');
      console.log('Using stored file names:', storedFileNames);
      
      // Check if we have valid file names
      if (!Array.isArray(storedFileNames) || storedFileNames.length === 0) {
        console.log('No valid file names found');
        return "Untitled Group";
      }
      
      // Clean up file names (remove any invalid entries)
      const validFileNames = storedFileNames.filter(name => typeof name === 'string' && name.length > 0);
      
      if (validFileNames.length === 0) {
        console.log('No valid file names after filtering');
        return "Untitled Group";
      }
      
      const topic = await getClipTopic(validFileNames);
      return topic || "Untitled Group";
    } catch (error) {
      console.log("Error in generateGroupName:", error);
      return "Untitled Group";
    }
  }

  async groupVideos() {
    const ungroupedVideos = [...this.videos];
    const newGroups: VideoGroup[] = [];
    
    while (ungroupedVideos.length > 0) {
      const currentVideo = ungroupedVideos[0];
      const similarVideos = [currentVideo];
      
      // Find similar videos based on name
      for (let i = 1; i < ungroupedVideos.length; i++) {
        const video = ungroupedVideos[i];
        const currentName = currentVideo.fileName;
        const compareName = video.fileName;
        
        // Simple similarity check - can be improved
        if (currentName.toLowerCase().includes(compareName.toLowerCase()) || 
            compareName.toLowerCase().includes(currentName.toLowerCase())) {
          similarVideos.push(video);
          ungroupedVideos.splice(i, 1);
          i--;
        }
      }
      
      // Remove the current video from ungrouped
      ungroupedVideos.shift();
      
      // Create new group
      let groupName;
      try {
        groupName = await this.generateGroupName(similarVideos.map(v => v.fileName));
      } catch (error) {
        console.error("Error generating group name:", error);
        groupName = "Untitled Group";
      }
      
      newGroups.push({
        id: getUid(),
        name: groupName,
        videos: similarVideos.map(v=>v.fileName)
      });
    }
    
    this.videoGroups = newGroups;
  }

  setSortedImages(images: MediaResource[]): void {
    this.images = images;
  }

  setSortedVideos(videos: MediaResource[]): void {
    this.videos = videos;
  }

  setSortedAudios(audios: MediaResource[]): void {
    this.audios = audios;
  }

  cleanupResources(): void {
    [...this.videos, ...this.images, ...this.audios].forEach(resource => {
      if (resource.url.startsWith('blob:')) {
        URL.revokeObjectURL(resource.url);
      }
    });
  }

  createTimeline(name: string) {
    const timeline: Timeline = {
      id: getUid(),
      name,
      elements: [],
      duration: this.maxTime  // Use current maxTime
    };
    this.timelines.push(timeline);
    if (!this.activeTimelineId) {
      this.setActiveTimeline(timeline.id);
    }
  }

  setActiveTimeline(timelineId: string) {
    this.activeTimelineId = timelineId;
    const timeline = this.timelines.find(t => t.id === timelineId);
    if (timeline) {
      this.editorElements = timeline.elements;
      // Update maxTime based on the longest element in the timeline
      const maxEndTime = Math.max(
        ...timeline.elements.map(e => e.timeFrame.end),
        timeline.duration
      );
      this.maxTime = maxEndTime;
      this.refreshElements();
    }
  }

  splitElementAtTime(elementId: string, timeMs: number) {
    const element = this.editorElements.find(e => e.id === elementId);
    if (!element) return;

    // Don't split if time is outside element bounds
    if (timeMs <= element.timeFrame.start || timeMs >= element.timeFrame.end) return;

    // Find the index of the original element
    const elementIndex = this.editorElements.findIndex(e => e.id === elementId);

    // Create new element as a copy of the original
    const newElement: EditorElement = {
      ...element,
      id: getUid(),
      name: `${element.name} (split)`,
      timeFrame: {
        start: timeMs,
        end: element.timeFrame.end
      }
    };

    // Adjust original element end time
    element.timeFrame.end = timeMs;

    // Insert the new element right after the original element
    this.editorElements.splice(elementIndex + 1, 0, newElement);
    
    // Refresh the view
    this.refreshElements();
    this.refreshAnimations();
  }

  mergeElements(elementIds: string[]) {
    if (elementIds.length < 2) return;

    const elements = elementIds
      .map(id => this.editorElements.find(e => e.id === id))
      .filter((e): e is EditorElement => e !== undefined)
      .sort((a, b) => a.timeFrame.start - b.timeFrame.start);

    // Check if elements are consecutive and of same type
    for (let i = 1; i < elements.length; i++) {
      if (elements[i].timeFrame.start !== elements[i-1].timeFrame.end ||
          elements[i].type !== elements[i-1].type) {
        return;
      }
    }

    // Create merged element
    const mergedElement: EditorElement = {
      ...elements[0],
      id: getUid(),
      name: `${elements[0].name} (merged)`,
      timeFrame: {
        start: elements[0].timeFrame.start,
        end: elements[elements.length - 1].timeFrame.end
      }
    };

    // Remove original elements and add merged one
    this.editorElements = this.editorElements.filter(e => !elementIds.includes(e.id));
    this.addEditorElement(mergedElement);
  }

  rippleTimelineChanges(elementId: string, timeChange: number) {
    const elements = this.editorElements;
    const elementIndex = elements.findIndex(e => e.id === elementId);
    
    if (elementIndex === -1) return;
    
    // Ripple edit all elements after the changed element
    for (let i = elementIndex + 1; i < elements.length; i++) {
      const element = elements[i];
      this.updateEditorElementTimeFrame(element, {
        start: element.timeFrame.start + timeChange,
        end: element.timeFrame.end + timeChange
      });
    }
  }


  snapToNearestClip(time: number, threshold: number = 100): number {
    const snapPoints = this.editorElements.flatMap(element => [
      element.timeFrame.start,
      element.timeFrame.end
    ]);

    const nearestPoint = snapPoints.reduce((nearest, point) => {
      const distance = Math.abs(point - time);
      if (distance < threshold && distance < Math.abs(nearest - time)) {
        return point;
      }
      return nearest;
    }, time);

    return nearestPoint;
  }

  async trimVideo(videoUrl: string, startTime: number, endTime: number): Promise<string> {
    const ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd";
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    // Download the video file
    const videoData = await fetchFile(videoUrl);
    await ffmpeg.writeFile('input.mp4', videoData);

    // Execute the trim command
    const duration = (endTime - startTime) / 1000; // Convert to seconds
    await ffmpeg.exec([
      '-ss', `${startTime / 1000}`,
      '-i', 'input.mp4',
      '-t', `${duration}`,
      '-c', 'copy',
      'output.mp4'
    ]);

    // Read the output file
    const data = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([data], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }

  async trimElement(elementId: string) {
    const element = this.editorElements.find(e => e.id === elementId);
    if (!element || element.type !== 'video') return;

    try {
      const trimmedVideoUrl = await this.trimVideo(
        element.properties.src,
        element.timeFrame.start,
        element.timeFrame.end
      );

      // Create new trimmed element
      const newElement: VideoEditorElement = {
        ...element,
        id: getUid(),
        name: `${element.name} (trimmed)`,
        properties: {
          ...element.properties,
          src: trimmedVideoUrl,
          elementId: `video-${getUid()}`
        }
      };
      // Replace the original element with the trimmed one
      this.editorElements = this.editorElements.map(e => 
        e.id === elementId ? newElement : e
      );
      
      this.refreshElements();
    } catch (error) {
      console.error('Error trimming video:', error);
    }
  }

  async uncutElement(elementId: string) {
    const element = this.editorElements.find(e => e.id === elementId);
    if (!element || element.type !== 'video') return;

    // Reset timeframe to original duration
    const videoElement = document.getElementById(element.properties.elementId) as HTMLVideoElement;
    if (!videoElement) return;

    this.updateEditorElementTimeFrame(element, {
      start: 0,
      end: videoElement.duration * 1000
    });
  }

  }



export function isEditorAudioElement(
  element: EditorElement
): element is AudioEditorElement {
  return element.type === "audio";
}
export function isEditorVideoElement(
  element: EditorElement
): element is VideoEditorElement {
  return element.type === "video";
}

export function isEditorImageElement(
  element: EditorElement
): element is ImageEditorElement {
  return element.type === "image";
}


function getTextObjectsPartitionedByCharacters(textObject: fabric.Text, element: TextEditorElement): fabric.Text[] {
  let copyCharsObjects: fabric.Text[] = [];
  // replace all line endings with blank
  const characters = (textObject.text ?? "").split('').filter((m) => m !== '\n');
  const charObjects = textObject.__charBounds;
  if (!charObjects) return [];
  const charObjectFixed = charObjects.map((m, index) => m.slice(0, m.length - 1).map(m => ({ m, index }))).flat();
  const lineHeight = textObject.getHeightOfLine(0);
  for (let i = 0; i < characters.length; i++) {
    if (!charObjectFixed[i]) continue;
    const { m: charObject, index: lineIndex } = charObjectFixed[i];
    const char = characters[i];
    const scaleX = textObject.scaleX ?? 1;
    const scaleY = textObject.scaleY ?? 1;
    const charTextObject = new fabric.Text(char, {
      left: charObject.left * scaleX + (element.placement.x),
      scaleX: scaleX,
      scaleY: scaleY,
      top: lineIndex * lineHeight * scaleY + (element.placement.y),
      fontSize: textObject.fontSize,
      fontWeight: textObject.fontWeight,
      fill: '#fff',
    });
    copyCharsObjects.push(charTextObject);
  }
  return copyCharsObjects;
}