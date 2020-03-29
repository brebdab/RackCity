import axios from "axios";
import { API_ROOT } from "../../utils/api-config";
import * as actionTypes from "./actionTypes";
import { ChangePlan } from "../../utils/utils";

export const DUKE_OAUTH_URI =
  "https://oauth.oit.duke.edu/oauth/authorize.php?client_id=hyposoft-rack-city&response_type=token&state=1129&scope=basic&redirect_uri=";

export const setChangePlan = (changePlan: ChangePlan) => {
  return {
    type: actionTypes.SWITCH_CHANGE_PLAN,
    changePlan: changePlan
  };
};

export const updateChangePlans = () => {
  return {
    type: actionTypes.UPDATE_CHANGE_PLANS,
    updateChangePlans: true
  };
};
export const authStart = () => {
  return {
    type: actionTypes.AUTH_START
  };
};

var console: any = {};

console.log = function() {};
export const authSuccess = (token: string) => {
  return {
    type: actionTypes.AUTH_SUCCESS,
    token: token
  };
};

export const authAdmin = () => {
  return {
    type: actionTypes.AUTH_ADMIN
  };
};

export const authFail = (error: string) => {
  return {
    type: actionTypes.AUTH_FAIL,
    error: error
  };
};

export const registrationFail = (error: string) => {
  return {
    type: actionTypes.REGISTRATION_FAIL,
    error: error
  };
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("expirationDate");
  return {
    type: actionTypes.AUTH_LOGOUT
  };
};

export const authLogin = (username: string, password: string) => {
  return (dispatch: any) => {
    dispatch(authStart());

    console.log(API_ROOT + "rest-auth/login/");

    axios
      .post(API_ROOT + "rest-auth/login/", {
        username: username,
        password: password
      })
      .then(res => {
        console.log(res);
        loginHelper(res, dispatch);
      })
      .catch(err => {
        console.log("login failed", err);
        dispatch(authFail(err));
      });
  };
};

export const netidAuthLogin = (access_token: string) => {
  return (dispatch: any) => {
    dispatch(authStart());
    console.log(API_ROOT + "api/users/netid-login");
    axios
      .post(API_ROOT + "api/users/netid-login", {
        access_token: access_token
      })
      .then(res => {
        console.log(res);
        loginHelper(res, dispatch);
      })
      .catch(err => {
        console.log("login failed", err);
        dispatch(authFail(err));
      });
  };
};

export const checkAdmin = (token: string) => {
  return (dispatch: any) => {
    const headers = {
      headers: {
        Authorization: "Token " + token
      }
    };
    axios
      .get(API_ROOT + "api/iamadmin", headers)
      .then(res => {
        if (res.data.is_admin) {
          dispatch(authAdmin());
        }
      })
      .catch(err => {
        console.log(err);
      });
  };
};

export const loginHelper = (res: any, dispatch: any) => {
  const token = res.data.key;
  const expirationDate = new Date(new Date().getTime() + 3600 * 1000);
  localStorage.setItem("token", token);
  localStorage.setItem("expirationDate", expirationDate.toString());

  dispatch(authSuccess(token));
  dispatch(checkAdmin(token));
  // dispatch(checkAuthTimeout(3600));
};

export const authCheckState = () => {
  return (dispatch: any) => {
    const token = localStorage.getItem("token");
    if (token === undefined) {
      dispatch(logout());
    } else {
      const expirationDate = new Date(localStorage.getItem("expirationDate")!);
      if (expirationDate <= new Date()) {
        dispatch(logout());
      } else {
        dispatch(authSuccess(token!));
        dispatch(checkAdmin(token!));
      }
    }
  };
};
