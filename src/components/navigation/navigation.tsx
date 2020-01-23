import * as React from "react";
import axios from "axios";
import "./navigation.css";
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
      <Navbar className={Classes.DARK}>
        <NavbarGroup>
          <NavbarHeading>HypoSoft</NavbarHeading>

          <NavbarDivider />
          <AnchorButton icon="home" text="Home" minimal />
        </NavbarGroup>
      </Navbar>
    );
  }
}
export default Navigation;
