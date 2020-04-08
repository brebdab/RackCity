import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Classes } from "@blueprintjs/core";
import ElementTab from "../elementView/elementTab";
import { RouteComponentProps } from "react-router";
import { connect } from "react-redux";
import { ElementType } from "../../utils/utils";

interface ChangePlannerProps {
  isAdmin: boolean;
}

class ChangePlannerView extends React.Component<
  ChangePlannerProps & RouteComponentProps
> {
  public render() {
    return (
      <div className={Classes.DARK + " user-view"}>
        <h1>Change Plans</h1>
        <ElementTab {...this.props} element={ElementType.CHANGEPLANS} />
      </div>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAdmin: state.admin,
  };
};

export default connect(mapStateToProps)(ChangePlannerView);
