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
  isAdmin: boolean;
  logout(): any;
}

type NavigationPropsAll = NavigationProps & RouteComponentProps;
export class Navigation extends React.Component<NavigationPropsAll> {
  public render() {
    console.log(this.props.isAdmin);
    return (
      <Router>
        <div>
          <Navbar className={Classes.DARK}>
            <NavbarGroup>
              <NavbarHeading>HypoSoft</NavbarHeading>
              <NavbarDivider />
              {this.props.isAuthenticated ? (
                <AnchorButton
                  onClick={() => this.props.history.push("/")}
                  className="nav-bar-button"
                  icon="home"
                  text="Home"
                  minimal
                />
              ) : null}
            </NavbarGroup>

            <NavbarGroup align={Alignment.RIGHT}>
              {this.props.isAdmin ? (
                <AnchorButton
                  onClick={() => this.props.history.push("/admin")}
                  text="Admin Settings"
                  minimal
                />
              ) : null}
              <NavbarDivider />
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
