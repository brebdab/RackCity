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

export interface NavigationProps {}

export class Navigation extends React.PureComponent<RouteComponentProps> {
  public render() {
    return (
      <Router>
        <div>
          <Navbar className={Classes.DARK}>
            <NavbarGroup>
              <NavbarHeading>HypoSoft</NavbarHeading>

              <NavbarDivider />
              <AnchorButton
                onClick={() => this.props.history.push("/")}
                className="nav-bar-button"
                icon="home"
                text="Home"
                minimal
              />
            </NavbarGroup>
            <NavbarGroup align={Alignment.RIGHT}>
              <AnchorButton
                onClick={() => this.props.history.push("/login")}
                className="nav-bar-button"
                icon="user"
                text="Login"
                minimal
              />
            </NavbarGroup>
          </Navbar>
        </div>
      </Router>
    );
  }
}
export default withRouter(Navigation);
