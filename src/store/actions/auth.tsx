import * as actionTypes from "./actionTypes";
import axios from "axios";
import { API_ROOT } from "../../api-config";

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
    type: actionTypes.AUTH_SUCCESS,
    error: error
  };
};

export const logout = () => {
  localStorage.removeItem("user");
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

export const authLogin = (username: string, password: string) => {
  return (dispatch: any) => {
    dispatch(authStart());
    axios
      .post(API_ROOT + "rest_auth/login/", {
        username: username,
        password: password
      })
      .then(res => loginHelper(res, dispatch))
      .catch(err => {
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
      .post(API_ROOT + "rest_auth/registration/", {
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
  const expirationDate = new Date(new Date().getTime() + 3600 * 1000);
  localStorage.setItem("token", token);
  localStorage.setItem("expirationDate", expirationDate.toString());
  dispatch(authSuccess(token));
  dispatch(checkAuthTimeout(3600));
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
        dispatch(
          checkAuthTimeout(
            (expirationDate.getTime() - new Date().getTime()) / 1000
          )
        );
      }
    }
  };
};
