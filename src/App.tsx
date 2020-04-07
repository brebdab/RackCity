import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "normalize.css/normalize.css";
import React from "react";
import { connect } from "react-redux";
import {
  BrowserRouter,
  Redirect,
  Route,
  RouteComponentProps
} from "react-router-dom";
import AssetView from "./components/elementView/detailedView/assetView/assetView";
import ModelView from "./components/elementView/detailedView/modelView/modelView";
import RackView from "./components/elementView/detailedView/rackView/rackView";
import BarcodeView from "./components/elementView/detailedView/assetView/barcodeView";
import Fallback, {
  NotAuthorized,
  NotAuthorizedAdmin
} from "./components/fallback";
import BulkImport from "./components/import/import";
import LandingView from "./components/landingView/landingView";
import Logs from "./components/logs/logs";
import Navigation from "./components/navigation/navigation";
import Report from "./components/report/report";
import User from "./components/userView/user";
import ChangePlannerView from "./components/changePlanner/changePlannerView";
import LoginView from "./forms/auth/loginView";
// import BulkExport from "./components/export/export";
import "./index.scss";
import * as actions from "./store/actions/state";
import { ROUTES} from "./utils/utils";
import CPDetailView from "./components/changePlanner/CPDetailView";
import {PermissionState} from "./utils/permissionUtils";

var console: any = {};
console.log = function () { };
export interface AppProps {
  isAuthenticated?: boolean;
  onTryAutoSignup: any;
  isAdmin: boolean;
  loading: boolean;
  permissionState: PermissionState;
}

class App extends React.Component<AppProps> {
  componentDidMount() {
    console.log(this.props.isAuthenticated);
    this.props.onTryAutoSignup();
  }

  RedirectToLoginRoute = ({ ...rest }: any) => {
    return this.props.isAuthenticated ? (
      <Route {...rest} />
    ) : (
        <Route {...rest}>
          <Redirect to={ROUTES.LOGIN} />
        </Route>
      );
  };

  PrivateRoute = ({ path, component, render, ...rest }: any) => {
    return component ? (
      <Route
        path={path}
        {...rest}
        component={this.props.isAuthenticated ? component : NotAuthorized}
      />
    ) : render ? (
      <Route
        path={path}
        {...rest}
        render={this.props.isAuthenticated ? render : NotAuthorized}
      />
    ) : null;
  };

  AdminRoute = ({ path, component, ...rest }: any) => {
    return (
      <Route
        path={path}
        component={
          this.props.isAuthenticated
            ? this.props.permissionState.admin
              ? component
              : NotAuthorizedAdmin
            : NotAuthorized
        }
        {...rest}
      />
    );
  };

  render() {
    return (
      <BrowserRouter basename="/">
        <div>
          <Navigation {...this.props} />

          <Route path={ROUTES.LOGIN} component={LoginView} />
          <div className="dashboard ">
            <this.PrivateRoute
              path={ROUTES.DASHBOARD}
              render={(props: RouteComponentProps) => (
                <LandingView {...props} />
              )}
            />
            <this.RedirectToLoginRoute exact path="/">
              {" "}
              <Redirect to={ROUTES.DASHBOARD} />
            </this.RedirectToLoginRoute>
            <Route path="/" component={Fallback}></Route>

            <this.PrivateRoute
              path={ROUTES.MODELS + "/:rid"}
              component={ModelView}
            />
            <this.PrivateRoute
              path={ROUTES.ASSETS + "/:rid"}
              component={AssetView}
            />
            <this.PrivateRoute
              path={ROUTES.CHANGE_PLAN + "/:id"}
              component={CPDetailView}
            />
          </div>
          <this.PrivateRoute path={ROUTES.REPORT} component={Report} />
          <this.PrivateRoute path={ROUTES.LOGS} component={Logs} />
          <this.PrivateRoute path={ROUTES.RACK_PRINT} component={RackView} />
          <this.PrivateRoute
            path={ROUTES.BARCODE_PRINT}
            component={BarcodeView}
          />
          <this.PrivateRoute
            exact
            path={ROUTES.CHANGE_PLAN}
            component={ChangePlannerView}
          />
          <this.PrivateRoute path={ROUTES.BULK_IMPORT} component={BulkImport} />

          {/* admin paths */}
          <this.AdminRoute path={ROUTES.USERS} component={User} />
        </div>
      </BrowserRouter>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAuthenticated: state.token !== null,
    isAdmin: state.admin,
    permissionState: state.permissionState,
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
