import pkg from 'express-openid-connect';
const { auth } = pkg;

export const bffAuthMiddleware = auth({
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
  
  authorizationParams: {
    response_type: 'code',  
    response_mode: 'query', 
  },

  session: {
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Keep true for prod HTTPS
      sameSite: 'Lax',
    }
  }
});
