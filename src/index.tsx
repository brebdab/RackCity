import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "normalize.css/normalize.css";
import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import RackView from "./components/detailedView/rackView/rackView";
import ElementView from "./components/elementView/elementView";
import Notfound from "./components/fallback"; // 404 page
import Navigation from "./components/navigation/navigation";
import "./index.scss";
import * as serviceWorker from "./serviceWorker";

const App = () => (
  <BrowserRouter basename="/">
    <div>
      <Navigation />
      <Switch>
        <Route exact path="/" component={ElementView} />
        {/* Landing page shows table viewer */}
        <Route path="/racks/:rid" component={RackView} />
        {/* Rack view based on rack id (rid)*/}
        {/*<Route path="/rack" component={View}/> {/* path and which component to be rendered */}
        <Route component={Notfound} />
      </Switch>
    </div>
  </BrowserRouter>
);

ReactDOM.render(<App />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
