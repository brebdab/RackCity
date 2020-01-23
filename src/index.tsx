import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import { Route, Link, BrowserRouter as Router, Switch } from 'react-router-dom';
import Navigation from './components/navigation/navigation';
import ElementView from './components/elementView/elementView';
import Notfound from './components/fallback'; // 404 page
import * as serviceWorker from './serviceWorker';
import "normalize.css/normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

const App = () => (
  <Router>
      <div>
          <Navigation />
          <Switch>
            <Route exact path="/" component={ElementView} /> {/* Landing page shows table viewer */}
            {/*<Route path="/rack" component={View}/> {/* path and which component to be rendered */}
            <Route component={Notfound} />
          </Switch>

      </div>
    </Router>
);


ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
