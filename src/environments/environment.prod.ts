export const environment = {
  production: true,
  apiBaseUrl: 'http://landlens-production-alb-1919392235.ap-south-1.elb.amazonaws.com',
  mapbox: {
    accessToken: 'YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN',
    style: 'mapbox://styles/mapbox/satellite-streets-v12'
  },
  cloudinary: {
    cloudName: 'landlens-placeholder',
    uploadPreset: 'landlens_unsigned_preset'
  }
};
