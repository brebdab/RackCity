import {
  AnchorButton,
  Classes,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Alignment
} from "@blueprintjs/core";
import * as React from "react";
import { RouteComponentProps } from "react-router";
import { BrowserRouter as Router, withRouter } from "react-router-dom";
import "./navigation.scss";
import * as actions from "../../store/actions/auth";
import { connect } from "react-redux";
import axios from "axios";
import { API_ROOT } from "../../utils/api-config";

export interface NavigationProps {
  isAuthenticated: boolean;
  logout(): any;
  isAdmin: boolean;
  token: string;
}

export interface NavigationState {
  username?: string;
}

type NavigationPropsAll = NavigationProps & RouteComponentProps;
export class Navigation extends React.Component<
  NavigationPropsAll,
  NavigationState
> {
  public state = {
    username: undefined
  };
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

    return (
      <Router>
        <div>
          <Navbar className={Classes.DARK + " nav-bar"}>
            <NavbarGroup>
              <NavbarHeading onClick={() => this.props.history.push("/")}>
                <AnchorButton
                  onClick={() => this.props.history.push("/")}
                  className="nav-bar-button"
                  icon="home"
                  text="HypoSoft"
                  minimal
                />
              </NavbarHeading>
              <NavbarDivider />
              {this.props.isAuthenticated ? (
                <div>
                  <AnchorButton
                    onClick={() => this.props.history.push("/report")}
                    className="nav-bar-button"
                    icon="numbered-list"
                    text="View Report"
                    minimal
                  />
                  <AnchorButton
                    onClick={() => this.props.history.push("/logs")}
                    className="nav-bar-button"
                    icon="history"
                    text="View Logs"
                    minimal
                  />
                </div>
              ) : (
                <p></p>
              )}
            </NavbarGroup>

            <NavbarGroup align={Alignment.RIGHT}>
              {this.props.isAuthenticated ? (
                <div>
                  {this.state.username ? (
                    <AnchorButton
                      className="nav-bar-non-button nav-bar-button"
                      text={"Welcome, " + this.state.username}
                      minimal
                    />
                  ) : null}
                  {this.props.isAdmin ? (
                    <AnchorButton
                      icon="user"
                      onClick={() => this.props.history.push("/users")}
                      text="Manage Users"
                      minimal
                    />
                  ) : null}
                  <AnchorButton
                    onClick={() => this.clearUsernameAndLogout()}
                    className="nav-bar-button"
                    icon="user"
                    text="Logout"
                    minimal
                  />
                </div>
              ) : (
                <AnchorButton
                  onClick={() => this.props.history.push("/login")}
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
    token: state.token
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    logout: () => dispatch(actions.logout())
  };
};
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(Navigation)
);
