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

export interface NavigationProps {
  isAuthenticated: boolean;
  logout(): any;
  isAdmin: boolean;
}

type NavigationPropsAll = NavigationProps & RouteComponentProps;
export class Navigation extends React.Component<NavigationPropsAll> {
  public render() {
    return (
      <Router>
        <div>
          <Navbar className={Classes.DARK + " nav-bar"}>
            <NavbarGroup>
              <NavbarHeading>HypoSoft</NavbarHeading>
              <NavbarDivider />
              {this.props.isAuthenticated ? (
                <div>
                  <AnchorButton
                    onClick={() => this.props.history.push("/")}
                    className="nav-bar-button"
                    icon="home"
                    text="Home"
                    minimal
                  />
                  {/*<AnchorButton
                    onClick={() => this.props.history.push("/bulk-export")}
                    className="nav-bar-button"
                    icon="import"
                    text="Export"
                    minimal
                  />*/}
                  <AnchorButton
                    onClick={() => this.props.history.push("/report")}
                    className="nav-bar-button"
                    icon="numbered-list"
                    text="View Report"
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
                  <p>
                    Welcome, username
                  </p>
                  {this.props.isAdmin ? (
                    <AnchorButton
                      icon="user"
                      onClick={() => this.props.history.push("/users")}
                      text="Manage users"
                      minimal
                    />
                  ) : null}
                  <AnchorButton
                    onClick={this.props.logout}
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
    isAdmin: state.admin
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
