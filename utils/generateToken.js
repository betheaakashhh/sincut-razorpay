import jwt from 'jsonwebtoken';
export const generateToken = (payload) =>{
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN});
};
export const generateRefreshToken = (payload) =>{
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN});
};
export default {generateToken, generateRefreshToken};