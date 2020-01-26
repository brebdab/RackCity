import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "normalize.css/normalize.css";
import React from "react";
import { connect } from "react-redux";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import RackView from "./components/detailedView/rackView/rackView";
import ElementView from "./components/elementView/elementView";
import Notfound from "./components/fallback"; // 404 page
import WrappedNormalLoginForm from "./components/login/login";
import WrappedNormalRegistrationForm from "./components/login/register";
import Navigation from "./components/navigation/navigation";
import "./index.scss";

import ModelView from "./components/detailedView/modelView/modelView";
import InstanceViewWrap from "./components/detailedView/instanceView/instanceView";
import * as actions from "./store/actions/auth";
import WrappedCreateModelForm from "./forms/createModelForm";

export interface AppProps {
  isAuthenticated: boolean;
  onTryAutoSignup: any;
}
class App extends React.Component<AppProps> {
  componentDidMount() {
    this.props.onTryAutoSignup();
  }
  render() {
    console.log(this.props.isAuthenticated);
    return (
      <BrowserRouter basename="/">
        <div>
          <Navigation {...this.props} />
          <Switch>
            <Route exact path="/">
              {this.props.isAuthenticated ? (
                <ElementView />
              ) : (
                <Redirect to="/login" />
              )}
            </Route>
            {/* Landing page shows table viewer */}
            <Route path="/racks/:rid" component={RackView} />
            <Route path="/login" component={WrappedNormalLoginForm} />
            <Route path="/racks/:rid" component={RackView} />
            <Route path="/models/:rid" component={ModelView} />
            <Route path="/instances/:rid" component={InstanceViewWrap} />
            <Route path="/create" component={WrappedCreateModelForm} />
            {/* admin paths */}
            <Route path="/admin" component={WrappedNormalRegistrationForm} />

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
