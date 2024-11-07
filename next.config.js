/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental:{
    serverActions:true
  },
  webpack: (config) => {
    config.externals.push({
      sharp: "commonjs sharp",
      canvas: "commonjs canvas",
    });
    return config;
  },
};

module.exports = nextConfig;
