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
    axios.get("https://rack-city-dev.herokuapp.com/api/").then(res => {
      console.log(res.data);
    });

    // axios.get('http://127.0.0.1:8000/api/').then(res => {
    //    console.log(res.data);

    //  })

    return (
      <Navbar className={Classes.DARK}>
        <NavbarGroup>
          <NavbarHeading>HypoSoft</NavbarHeading>

          <NavbarDivider />

          <AnchorButton icon="home" text="Home" minimal />
          {/* <AnchorButton
            href="http://blueprintjs.com/docs/v2/"
            text="Docs"
            target="_blank"
            minimal
            rightIcon="share"
          />
          <AnchorButton
            href="http://github.com/palantir/blueprint"
            text="Github"
            target="_blank"
            minimal
            rightIcon="code"
          /> */}
        </NavbarGroup>
      </Navbar>
    );
  }
}
export default Navigation;
