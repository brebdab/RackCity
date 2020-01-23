import * as React from "react";
import "./navigation.scss";
import { Route, Link, BrowserRouter as Router, Switch } from 'react-router-dom';
import { AnchorButton } from "@blueprintjs/core";
import {
  Classes,
  Navbar,
  NavbarGroup,
  NavbarHeading,
  NavbarDivider
} from "@blueprintjs/core";

export interface NavigationProps {}

export class Navigation extends React.PureComponent<NavigationProps> {
  public render() {
    return (
      <Router>
        <div>
          <Navbar className={Classes.DARK}>
            <NavbarGroup>
              <NavbarHeading>HypoSoft</NavbarHeading>

              <NavbarDivider />
              <AnchorButton
                className="nav-bar-button"
                icon="home"
                text="Home"
                minimal
              />
            </NavbarGroup>
          </Navbar>
        </div>
      </Router>
    );
  }
}
export default Navigation;
