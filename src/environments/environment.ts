export const environment = {
  production: false,
  apiBaseUrl: 'http://landlens-production-alb-1919392235.ap-south-1.elb.amazonaws.com',
  mapbox: {
    accessToken: 'YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN',
    style: 'mapbox://styles/mapbox/satellite-streets-v12'
  },
  cloudinary: {
    cloudName: 'landlens',
    uploadPreset: 'landlens_preset'
  }
};
