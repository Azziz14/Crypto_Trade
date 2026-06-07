const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['three'],
  webpack: (config, { isServer }) => {
    // three.js and sockjs use browser-only APIs
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas']
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },
}

export default nextConfig
