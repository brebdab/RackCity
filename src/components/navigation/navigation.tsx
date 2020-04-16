import {
  Alignment,
  AnchorButton,
  Button,
  Classes,
  MenuItem,
  Navbar,
  NavbarDivider,
  NavbarGroup,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import axios from "axios";
import * as React from "react";
import Banner from "react-js-banner";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { BrowserRouter as Router, withRouter } from "react-router-dom";
import { isNullOrUndefined } from "util";
import {
  ChangePlanSelect,
  filterChangePlan,
  renderChangePlanItem,
} from "../../forms/formUtils";
import * as actions from "../../store/actions/state";
import { API_ROOT } from "../../utils/api-config";
import { ChangePlan, ElementType, getHeaders, ROUTES } from "../../utils/utils";
import "./navigation.scss";
import { PermissionState } from "../../utils/permissionUtils";
export interface NavigationProps {
  isAuthenticated: boolean;
  logout(): any;
  setChangePlan(changePlan: ChangePlan | null): void;
  isAdmin: boolean;
  token: string;
  changePlan: ChangePlan;
  updateChangePlansBoolean: boolean;
  updateChangePlans(status: boolean): void;
  permissionState: PermissionState;
  isMobile: boolean;
}

export interface NavigationState {
  username?: string;
  changePlans: Array<ChangePlan>;
}

const getChangePlanList = (token: string) => {
  return axios.post(
    API_ROOT + "api/change-plans/get-many",
    {},
    getHeaders(token)
  );
};

type NavigationPropsAll = NavigationProps & RouteComponentProps;
export class Navigation extends React.Component<
  NavigationPropsAll,
  NavigationState
> {
  public state = {
    username: undefined,
    changePlans: [],
  };

  sucessfulChangePlanRequest = false;
  getUsername(token: string) {
    const headers = {
      headers: {
        Authorization: "Token " + token,
      },
    };
    axios
      .get(API_ROOT + "api/users/who-am-i", headers)
      .then((res) => {
        this.setState({ username: res.data.username });
      })
      .catch((err) => {});
  }
  clearUsernameAndLogout() {
    this.setState({ username: undefined });
    this.props.logout();
  }

  public render() {
    if (this.props.isAuthenticated && !this.state.username) {
      this.getUsername(this.props.token);
    }
    if (
      !this.sucessfulChangePlanRequest ||
      this.props.updateChangePlansBoolean
    ) {
      getChangePlanList(this.props.token).then((res) => {
        this.sucessfulChangePlanRequest = true;
        this.props.updateChangePlans(false);
        let items: Array<ChangePlan> = res.data[ElementType.CHANGEPLANS];
        items = items.filter((changePlan) =>
          isNullOrUndefined(changePlan.execution_time)
        );
        this.setState({
          changePlans: items,
        });
      });
    }

    return (
      <Router>
        <div>
          {this.props.changePlan ? (
            <div
              onClick={() =>
                this.props.history.push(
                  ROUTES.CHANGE_PLAN + "/" + this.props.changePlan.id
                )
              }
            >
              <Banner
                title={
                  "Change Plan: " +
                  this.props.changePlan.name +
                  "\n (click here to see summary of this change plan)"
                }
              />
            </div>
          ) : null}
          <Navbar className={Classes.DARK + " nav-bar"}>
            <NavbarGroup>

              <AnchorButton
                className="nav-bar-non-button nav-bar-button"
                text="HypoSoft"
                minimal
              />


              <NavbarDivider />

              {this.props.isAuthenticated && !this.props.isMobile ? (
                <div>
                  <Button
                    className="nav-bar-button"
                    minimal
                    icon="panel-table"
                    text="Asset Management"
                    onClick={() => this.props.history.push(ROUTES.DASHBOARD)}
                  />
                  <Button
                    className="nav-bar-button"
                    minimal
                    disabled={this.props.changePlan ? true : false}
                    text="Report"
                    icon="numbered-list"
                    onClick={() => this.props.history.push(ROUTES.REPORT)}
                  />

                  <Button
                    className="nav-bar-button"
                    minimal
                    onClick={() => this.props.history.push(ROUTES.LOGS)}
                    icon="history"
                    text="Logs"
                    disabled={
                      !(
                        this.props.permissionState.admin ||
                        this.props.permissionState.audit_read
                      )
                    }
                  />
                  <Button
                    className="nav-bar-button"
                    minimal
                    icon="user"
                    onClick={() => this.props.history.push(ROUTES.USERS)}
                    disabled={!this.props.permissionState.admin}
                    text="Users"
                  />
                  {/*  */}
                </div>
              ) : (
                <p></p>
              )}
            </NavbarGroup>

            <NavbarGroup align={Alignment.RIGHT}>
              {this.props.isAuthenticated ? (
                <div className="nav-buttons-right">
                  {this.props.isMobile ? null : (
                    <>
                      <ChangePlanSelect
                        popoverProps={{
                          minimal: true,
                          popoverClassName: "dropdown",
                          usePortal: true,
                        }}
                        disabled={this.props.location.pathname.includes(
                          "/dashboard/change-plans/"
                        )}
                        items={this.state.changePlans}
                        onItemSelect={(changePlan: ChangePlan) => {
                          this.props.setChangePlan(changePlan);
                        }}
                        itemRenderer={renderChangePlanItem}
                        itemPredicate={filterChangePlan}
                        noResults={
                          <MenuItem disabled={true} text="No results." />
                        }
                      >
                        <Button
                          minimal
                          disabled={this.props.location.pathname.includes(
                            "/dashboard/change-plans/"
                          )}
                          rightIcon="caret-down"
                          text={
                            this.props.changePlan
                              ? this.props.changePlan.name
                              : "Select Change Plan"
                          }
                          icon={IconNames.GIT_BRANCH}
                        />
                      </ChangePlanSelect>

                  {this.props.changePlan ? (
                    <AnchorButton
                      className="nav-bar-button"
                      minimal
                      disabled={this.props.location.pathname.includes(
                        "/dashboard/change-plans/"
                      )}
                      icon={IconNames.DELETE}
                      onClick={() => this.props.setChangePlan(null)}
                    />
                  ) : null}
                  <AnchorButton
                    className="nav-bar-button"
                    onClick={() => this.props.history.push(ROUTES.CHANGE_PLAN)}
                    icon="clipboard"
                    minimal
                    text="Change Plans"
                  />
                  <NavbarDivider />
                  {this.state.username ? (
                    <AnchorButton
                      className="nav-bar-non-button nav-bar-button"
                      text={"Welcome, " + this.state.username}
                      minimal
                    />
                  ) : null}

                    </>
                  )}

                  <AnchorButton
                    onClick={() => {
                      this.clearUsernameAndLogout();
                      this.props.history.push(ROUTES.LOGIN);
                    }}
                    className="nav-bar-button"
                    icon="user"
                    text="Logout"
                    minimal
                  />
                </div>
              ) : (
                <AnchorButton
                  onClick={() => this.props.history.push(ROUTES.LOGIN)}
                  className="nav-bar-button"
                  icon="user"
                  text="Login"
                  minimal
                />
              )}
            </NavbarGroup>
          </Navbar>
        </div>
      </Router>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAuthenticated: state.token !== null,
    isAdmin: state.admin,
    token: state.token,
    changePlan: state.changePlan,
    updateChangePlansBoolean: state.updateChangePlansBoolean,
    permissionState: state.permissionState,
    isMobile: state.isMobile,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    logout: () => dispatch(actions.logout()),
    updateChangePlans: (status: boolean) =>
      dispatch(actions.updateChangePlans(status)),

    setChangePlan: (changePlan: ChangePlan) =>
      dispatch(actions.setChangePlan(changePlan)),
  };
};
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(Navigation)
);
