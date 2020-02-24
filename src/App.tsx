import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "normalize.css/normalize.css";
import React from "react";
import { connect } from "react-redux";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import AssetView from "./components/elementView/detailedView/assetView/assetView";
import ModelView from "./components/elementView/detailedView/modelView/modelView";
import BulkImport from "./components/import/import";
import LandingView from "./components/landingView/landingView";
import Navigation from "./components/navigation/navigation";
import Report from "./components/report/report";
import User from "./components/userView/user";
import LoginView from "./forms/auth/loginView";
import Logs from "./components/logs/logs";
import RackView from "./components/elementView/detailedView/rackView/rackView";
// import BulkExport from "./components/export/export";
import "./index.scss";
import * as actions from "./store/actions/auth";
import {
  NotAuthorized,
  NotFound,
  NotAuthorizedAdmin
} from "./components/fallback";

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
        component={this.props.isAuthenticated ? component : NotAuthorized}
      />
    );
  };

  AdminRoute = ({ path, component, ...rest }: any) => {
    return (
      <Route
        path={path}
        component={
          this.props.isAuthenticated
            ? this.props.isAdmin
              ? component
              : NotAuthorizedAdmin
            : NotAuthorized
        }
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
            <Route path="/login" component={LoginView} />
            <this.PrivateRoute path="/models/:rid" component={ModelView} />
            <this.PrivateRoute path="/assets/:rid" component={AssetView} />
            <this.PrivateRoute path="/report" component={Report} />
            <this.PrivateRoute path="/logs" component={Logs} />
            <this.PrivateRoute path="/rack-print" component={RackView} />

            {/* admin paths */}
            <this.AdminRoute path="/users" component={User} />
            <this.AdminRoute path="/bulk-upload" component={BulkImport} />
            <Route path="/*" component={NotFound} />
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
