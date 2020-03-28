import { RouteComponentProps } from "react-router";
import { connect } from "react-redux";
import * as React from "react";
import { Classes, AnchorButton } from "@blueprintjs/core";
import { withRouter } from "react-router-dom";

interface CPDetailViewProps {
  token: string;
}
interface CPDetailViewState {}
class CPDetailView extends React.Component<
  CPDetailViewProps & RouteComponentProps,
  CPDetailViewState
> {
  route_id = (this.props.match.params as any).id;
  getData = () => {
    //TODO call backend endpoint
  };
  getConflictWarning = () => {
    return <div></div>;
  };
  public render() {
    return (
      <div className={Classes.DARK + " asset-view"}>
        <h1>Change Plan</h1>
        <div className="detail-buttons-wrapper">
          <div className={"detail-buttons"}>
            <AnchorButton
              minimal
              intent="primary"
              icon="document-open"
              text="Generate Work Order"
            />
          </div>
        </div>
        <AnchorButton intent="primary" icon="build" text="Execute Work Order" />
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(CPDetailView));
