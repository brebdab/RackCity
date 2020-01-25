import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "normalize.css/normalize.css";
import React from "react";
import ReactDOM from "react-dom";
<<<<<<< HEAD
=======
import { BrowserRouter, Route, Switch } from "react-router-dom";
import RackView from "./components/detailedView/rackView/rackView";
import ModelView from "./components/detailedView/modelView/modelView";
import InstanceViewWrap from "./components/detailedView/instanceView/instanceView";
import ElementView from "./components/elementView/elementView";
import Notfound from "./components/fallback"; // 404 page
import Navigation from "./components/navigation/navigation";
>>>>>>> 4aab60c0bb934bacbc10ae590b8d78c83db5056b
import "./index.scss";
import * as serviceWorker from "./serviceWorker";
import App from "./App";
import { createStore, compose, applyMiddleware } from "redux";
import reducer from "./store/reducers/auth";
import thunk from "redux-thunk";
import { Provider } from "react-redux";

const composeEnhances =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose || compose;

const store = createStore(reducer, composeEnhances(applyMiddleware(thunk)));

const app = (
  <Provider store={store}>
    <App />
  </Provider>
);

ReactDOM.render(app, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
