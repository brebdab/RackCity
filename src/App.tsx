import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "normalize.css/normalize.css";
import React from "react";
import { connect } from "react-redux";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import InstanceView from "./components/elementView/detailedView/instanceView/instanceView";
import ModelView from "./components/elementView/detailedView/modelView/modelView";
import Notfound from "./components/fallback"; // 404 page
import LandingView from "./components/landingView/landingView";
import WrappedNormalLoginForm from "./forms/auth/login";
import WrappedNormalRegistrationForm from "./forms/auth/register";
import Navigation from "./components/navigation/navigation";
import BulkImport from "./components/import/import";
// import BulkExport from "./components/export/export";

import "./index.scss";
import * as actions from "./store/actions/auth";

import Report from "./components/report/report";

var console: any = {};
console.log = function() {};
export interface AppProps {
  isAuthenticated?: boolean;
  onTryAutoSignup: any;
  isAdmin: boolean;
  loading: boolean;
}

class App extends React.Component<AppProps> {
  componentDidMount() {
    console.log(this.props.isAuthenticated);
    this.props.onTryAutoSignup();
  }

  RedirectRoute = ({ ...rest }: any) => {
    return this.props.isAuthenticated ? (
      <Route {...rest} />
    ) : (
      <Route {...rest}>
        <Redirect to="/login" />
      </Route>
    );
  };

  PrivateRoute = ({ path, component, ...rest }: any) => {
    return (
      <Route
        path={path}
        component={this.props.isAuthenticated ? component : Notfound}
      />
    );
  };

  render() {
    return (
      <BrowserRouter basename="/">
        <div>
          <Navigation {...this.props} />
          <Switch>
            <this.RedirectRoute exact path="/" component={LandingView} />
            <Route path="/login" component={WrappedNormalLoginForm} />

            <this.PrivateRoute path="/models/:rid" component={ModelView} />
            <this.PrivateRoute
              path="/instances/:rid"
              component={InstanceView}
            />
            <this.PrivateRoute path="/report" component={Report} />
            {/* admin paths */}
            <this.PrivateRoute
              path="/register"
              component={
                this.props.isAdmin ? WrappedNormalRegistrationForm : Notfound
              }
            />
            <this.PrivateRoute
              path="/bulk-upload"
              component={this.props.isAdmin ? BulkImport : Notfound}
            />
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAuthenticated: state.token !== null,
    isAdmin: state.admin,
    loading: state.loading
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    onTryAutoSignup: () => {
      dispatch(actions.authCheckState());
    }
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
