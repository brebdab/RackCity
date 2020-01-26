import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";

interface PropertiesProps { };

export class PropertiesView extends React.PureComponent<
  RouteComponentProps,
  PropertiesProps
  > {

    public render() {
      return (
        <div className={Classes.DARK + " propsview"}>
          <h1>Properties Tab</h1>
        </div>
      )
    }

}

export default PropertiesView
