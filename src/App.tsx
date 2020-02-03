import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "normalize.css/normalize.css";
import React from "react";
import { connect } from "react-redux";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import RackView from "./components/detailedView/rackView/rackView";

import Notfound from "./components/fallback"; // 404 page
import WrappedNormalLoginForm from "./components/login/login";
import WrappedNormalRegistrationForm from "./components/login/register";
import Navigation from "./components/navigation/navigation";
import BulkImport from "./components/import/import";
import "./index.scss";

import ModelView from "./components/detailedView/modelView/modelView";
import InstanceView from "./components/detailedView/instanceView/instanceView";
import * as actions from "./store/actions/auth";
import ModelForm from "./forms/modelForm";
import LandingView from "./components/landingView/landingView";
import { conditionalExpression } from "@babel/types";

export interface AppProps {
  isAuthenticated: boolean;
  onTryAutoSignup: any;
  isAdmin: boolean;
}

class App extends React.Component<AppProps> {
  componentDidMount() {
    this.props.onTryAutoSignup();
  }
  PrivateRoute = ({ ...rest }: any) => {
    console.log(rest);

    return this.props.isAuthenticated ? (
      <Route {...rest} />
    ) : (
      <Route {...rest}>
        <Redirect to="/login" />
      </Route>
    );
  };

  render() {
    return (
      <BrowserRouter basename="/">
        <div>
          <Navigation {...this.props} />
          <Switch>
            <this.PrivateRoute exact path="/" component={LandingView} />
            <Route path="/login" component={WrappedNormalLoginForm} />
            <this.PrivateRoute path="/racks" component={RackView} />
            {/* <Route path="/models/:rid" component={ModelView} /> */}
            <this.PrivateRoute path="/models/:rid" component={ModelView} />
            <this.PrivateRoute
              path="/instances/:rid"
              component={InstanceView}
            />
            {/* admin paths */}
            <this.PrivateRoute
              path="/register"
              component={
                this.props.isAdmin ? WrappedNormalRegistrationForm : Notfound
              }
            />
            
            <this.PrivateRoute
              path="/bulk-upload"
              component={
                this.props.isAdmin ? WrappedNormalRegistrationForm : Notfound
              }
            />
            <Route component={Notfound} />
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAuthenticated: state.token !== null,
    isAdmin: state.admin
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
