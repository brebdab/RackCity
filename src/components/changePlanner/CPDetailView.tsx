import { RouteComponentProps } from "react-router";
import { connect } from "react-redux";
import * as React from "react";
import {
  Classes,
  AnchorButton,
  Pre,
  Collapse,
  Callout
} from "@blueprintjs/core";
import { withRouter } from "react-router-dom";
import "./changePlanner.scss";
interface CPDetailViewProps {
  token: string;
}
interface CPDetailViewState {
  isOpen: Array<boolean>;
}
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
  public state = {
    isOpen: [false, false]
  };
  items = ["a", "b"];
  toggleCollapse(index: number) {
    const isOpen = this.state.isOpen;
    isOpen[index] = !isOpen[index];
    this.setState({
      isOpen
    });
  }
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

          <ul className="bp3-list-unstyled">
            {this.items.map((item: string, index: number) => {
              return (
                <li>
                  <Callout
                    className="change-plan-item"
                    onClick={e => this.toggleCollapse(index)}
                  >
                    {item}{" "}
                  </Callout>
                  <Collapse isOpen={this.state.isOpen[index]}>
                    <Pre>{"hi julia"}</Pre>
                  </Collapse>
                </li>
              );
            })}
          </ul>
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
