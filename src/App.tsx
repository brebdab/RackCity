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

export interface AppProps {
  isAuthenticated: boolean;
  onTryAutoSignup: any;
}
class App extends React.Component<AppProps> {
  componentDidMount() {
    this.props.onTryAutoSignup();
  }
  render() {
    return (
      <BrowserRouter basename="/">
        <div>
          <Navigation {...this.props} />
          <Switch>
            <Route exact path="/">
              {this.props.isAuthenticated ? (
                <LandingView />
              ) : (
                <Redirect to="/login" />
              )}
            </Route>
            {/* Landing page shows table viewer */}
            <Route path="/login" component={WrappedNormalLoginForm} />
            <Route path="/racks" component={RackView} />
            <Route path="/models/:rid" component={ModelView} />
            <Route path="/instances/:rid" component={InstanceView} />

            {/* admin paths */}
            <Route path="/admin" component={WrappedNormalRegistrationForm} />
            <Route path="/bulk-upload" component={BulkImport} />
            <Route path="/create" component={ModelForm} />
            <Route component={Notfound} />
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAuthenticated: state.token !== null
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
