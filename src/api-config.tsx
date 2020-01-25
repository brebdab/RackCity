let backendHost;

const hostname = window && window.location && window.location.hostname;

if (hostname === "rack-city-dev.herokuapp.com") {
  backendHost = "https://rack-city-dev.herokuapp.com";
} else if (hostname === "rack-city-staging.herokuapp.com") {
  backendHost = "https://rack-city-staging.herokuapp.com";
} else if (hostname === "rack-city-prod.herokuapp.com") {
  backendHost = "https://rack-city-prod.herokuapp.com";
} else {
  backendHost = process.env.REACT_APP_BACKEND_HOST || "http://127.0.0.1:8000";
}

export const API_ROOT = `${backendHost}/api/`;
