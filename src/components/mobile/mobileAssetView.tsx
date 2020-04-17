import { Callout, Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { RouteComponentProps, withRouter } from "react-router";
import * as React from "react";
import { AssetObject } from "../../utils/utils";

interface MobileAssetViewProps {
  asset: AssetObject;
}

export class MobileAssetView extends React.PureComponent<
  MobileAssetViewProps & RouteComponentProps
> {
  render() {
    console.log(this.props.asset);
    return (
      <div className={Classes.DARK}>
        <Callout title={"Asset Properties"}>
          <p>Assets</p>
        </Callout>
        <Callout title={"Model Properties"}>
          <p>Models</p>
        </Callout>
        <Callout title={"Network Connections"}>
          <p>Network Connections</p>
        </Callout>
        <Callout title={"Power Connections"}>
          <p>Power Connections</p>
        </Callout>
      </div>
    );
  }
}

export default withRouter(MobileAssetView);
