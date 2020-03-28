import {
  Alignment,
  AnchorButton,
  Button,
  Classes,
  Menu,
  MenuItem,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Popover
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import axios from "axios";
import * as React from "react";
import Banner from "react-js-banner";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { BrowserRouter as Router, withRouter } from "react-router-dom";
import {
  ChangePlanSelect,
  filterChangePlan,
  renderChangePlanItem
} from "../../forms/formUtils";
import * as actions from "../../store/actions/state";
import { API_ROOT } from "../../utils/api-config";
import { ChangePlan, ROUTES, getHeaders, ElementType } from "../../utils/utils";
import "./navigation.scss";
export interface NavigationProps {
  isAuthenticated: boolean;
  logout(): any;
  setChangePlan(changePlan: ChangePlan | null): void;
  isAdmin: boolean;
  token: string;
  changePlan: ChangePlan;
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
    changePlans: []
  };

  sucessfulChangePlanRequest = false;
  getUsername(token: string) {
    const headers = {
      headers: {
        Authorization: "Token " + token
      }
    };
    axios
      .get(API_ROOT + "api/users/who-am-i", headers)
      .then(res => {
        this.setState({ username: res.data.username });
      })
      .catch(err => {
        console.log(err);
      });
  }
  clearUsernameAndLogout() {
    this.setState({ username: undefined });
    this.props.logout();
  }

  public render() {
    if (this.props.isAuthenticated && !this.state.username) {
      this.getUsername(this.props.token);
    }
    if (!this.sucessfulChangePlanRequest) {
      getChangePlanList(this.props.token).then(res => {
        this.sucessfulChangePlanRequest = true;
        const items = res.data[ElementType.CHANGEPLANS];
        this.setState({
          changePlans: items
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
                  this.props.changePlan.name +
                  "\n Click here to go to change plan summary"
                }
              />
            </div>
          ) : null}
          <Navbar className={Classes.DARK + " nav-bar"}>
            <NavbarGroup>
              <NavbarHeading
                onClick={() => this.props.history.push(ROUTES.DASHBOARD)}
              >
                <AnchorButton
                  onClick={() => this.props.history.push(ROUTES.DASHBOARD)}
                  className="nav-bar-button"
                  icon="home"
                  text="HypoSoft"
                  minimal
                />
              </NavbarHeading>
              <NavbarDivider />
              {this.props.isAuthenticated ? (
                <div>
                  <Popover
                    content={
                      <Menu>
                        <MenuItem
                          disabled={this.props.changePlan ? true : false}
                          text="View Report"
                          icon="numbered-list"
                          onClick={() => this.props.history.push(ROUTES.REPORT)}
                        />
                        <MenuItem
                          onClick={() => this.props.history.push(ROUTES.LOGS)}
                          icon="history"
                          text="View Logs"
                        />
                        <MenuItem
                          onClick={() =>
                            this.props.history.push(ROUTES.CHANGE_PLAN)
                          }
                          icon="clipboard"
                          text="Change Plans"
                        />
                        {this.props.isAdmin ? (
                          <MenuItem
                            icon="user"
                            onClick={() =>
                              this.props.history.push(ROUTES.USERS)
                            }
                            text="Manage Users"
                          />
                        ) : null}
                      </Menu>
                    }
                    // position={Position.RIGHT_TOP}
                  >
                    <Button icon="menu" text="Tools" minimal />
                  </Popover>
                </div>
              ) : (
                <p></p>
              )}
            </NavbarGroup>

            <NavbarGroup align={Alignment.RIGHT}>
              {this.props.isAuthenticated ? (
                <div>
                  <ChangePlanSelect
                    popoverProps={{
                      minimal: true,
                      popoverClassName: "dropdown",
                      usePortal: true
                    }}
                    items={this.state.changePlans}
                    onItemSelect={(changePlan: ChangePlan) => {
                      this.props.setChangePlan(changePlan);
                    }}
                    itemRenderer={renderChangePlanItem}
                    itemPredicate={filterChangePlan}
                    noResults={<MenuItem disabled={true} text="No results." />}
                  >
                    <Button
                      minimal
                      rightIcon="caret-down"
                      text={
                        this.props.changePlan
                          ? this.props.changePlan.name
                          : "Change Plans"
                      }
                      icon={IconNames.GIT_BRANCH}
                    />
                  </ChangePlanSelect>
                  {this.props.changePlan ? (
                    <AnchorButton
                      minimal
                      icon={IconNames.DELETE}
                      onClick={() => this.props.setChangePlan(null)}
                    />
                  ) : null}

                  {this.state.username ? (
                    <AnchorButton
                      className="nav-bar-non-button nav-bar-button"
                      text={"Welcome, " + this.state.username}
                      minimal
                    />
                  ) : null}

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
    changePlan: state.changePlan
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    logout: () => dispatch(actions.logout()),
    setChangePlan: (changePlan: ChangePlan) =>
      dispatch(actions.setChangePlan(changePlan))
  };
};
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(Navigation)
);
