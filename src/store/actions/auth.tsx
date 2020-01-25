import axios from "axios";
import jQuery from "jquery";
import { API_ROOT } from "../../api-config";
import * as actionTypes from "./actionTypes";
export const authStart = () => {
  return {
    type: actionTypes.AUTH_START
  };
};

export const authSuccess = (token: string) => {
  return {
    type: actionTypes.AUTH_SUCCESS,
    token: token
  };
};

export const authFail = (error: string) => {
  return {
    type: actionTypes.AUTH_FAIL,
    error: error
  };
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("experiationDate");
  return {
    type: actionTypes.AUTH_LOGOUT
  };
};
export const checkAuthTimeout = (expirationTime: number) => {
  return (dispatch: any) => {
    setTimeout(() => {
      dispatch(logout());
    }, expirationTime * 1000);
  };
};
function getCookie(name: string) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = jQuery.trim(cookies[i]);
      console.log(cookie);
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export const authLogin = (username: string, password: string) => {
  return (dispatch: any) => {
    dispatch(authStart());
    axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";
    axios.defaults.xsrfCookieName = "csrftoken";
    var csrf_token = getCookie("csrftoken");
    console.log(csrf_token);
    console.log(API_ROOT + "rest-auth/login/");

    axios
      .post(
        API_ROOT + "rest-auth/login/",
        {
          username: username,
          password: password
        }
        // {
        //   headers: {
        //     xsrfCookieName: "XSRF-TOKEN",
        //     xsrfHeaderName: "X-XSRF-TOKEN",
        //     "X-XSRF-TOKEN": csrf_token
        //   }
        //}
      )
      .then(res => loginHelper(res, dispatch))
      .catch(err => {
        console.log("failed");
        dispatch(authFail(err));
      });
  };
};

export const authSignup = (
  username: string,
  email: string,
  displayName: string,
  password1: string,
  password2: string
) => {
  return (dispatch: any) => {
    dispatch(authStart());
    axios
      .post(API_ROOT + "rest-auth/registration/", {
        username: username,
        email: email,
        displayName: displayName,
        password1: password1,
        password2: password2
      })
      .then(res => loginHelper(res, dispatch))
      .catch(err => {
        dispatch(authFail(err));
      });
  };
};

export const loginHelper = (res: any, dispatch: any) => {
  const token = res.data.key;
  console.log("success" + token);
  const expirationDate = new Date(new Date().getTime() + 3600 * 1000);
  localStorage.setItem("token", token);
  localStorage.setItem("expirationDate", expirationDate.toString());
  dispatch(authSuccess(token));
  dispatch(checkAuthTimeout(3600));
};

export const authCheckState = () => {
  return (dispatch: any) => {
    const token = localStorage.getItem("token");
    console.log(token);
    if (token === undefined) {
      dispatch(logout());
    } else {
      const expirationDate = new Date(localStorage.getItem("expirationDate")!);
      if (expirationDate <= new Date()) {
        dispatch(logout());
      } else {
        dispatch(authSuccess(token!));
        dispatch(
          checkAuthTimeout(
            (expirationDate.getTime() - new Date().getTime()) / 1000
          )
        );
      }
    }
  };
};
