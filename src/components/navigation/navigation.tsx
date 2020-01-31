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
          <Navbar className={Classes.DARK}>
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
                </div>
              ) : (
                <p></p>
              )}
              {this.props.isAdmin ? (
                <div>
                  <AnchorButton
                    onClick={() => this.props.history.push("/bulk-upload")}
                    className="nav-bar-button"
                    icon="export"
                    text="Upload File"
                    minimal
                  />
                </div>
              ) : (
                <p></p>
              )}
            </NavbarGroup>
            <NavbarGroup align={Alignment.RIGHT}>
              {this.props.isAuthenticated ? (
                <AnchorButton
                  onClick={this.props.logout}
                  className="nav-bar-button"
                  icon="user"
                  text="Logout"
                  minimal
                />
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
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Navigation));
