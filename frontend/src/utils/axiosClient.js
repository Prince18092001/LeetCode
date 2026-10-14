import axios from "axios"

// In production (Vercel), empty baseURL routes through Vercel rewrites (HTTPS -> HTTP proxy)
// In local development, connects directly to Azure backend
const isProduction = import.meta.env.PROD;

const axiosClient = axios.create({
    baseURL: isProduction ? '' : 'http://74.225.195.186:3000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});


export default axiosClient;

