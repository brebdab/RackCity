import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Classes } from "@blueprintjs/core";
import ElementTab from "../elementView/elementTab";
import { RouteComponentProps } from "react-router";
import "../elementView//elementView.scss";
import { connect } from "react-redux";
import { ElementType } from "../../utils/utils";
import "./user.scss";

interface UserProps {
  isAdmin: boolean;
}

class User extends React.Component<UserProps & RouteComponentProps> {
  public render() {
    return (
      <div className={Classes.DARK + " user-view"}>
        <h1>Users</h1>
        <ElementTab {...this.props} element={ElementType.USER} />
      </div>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAdmin: state.admin
  };
};

export default connect(mapStateToProps)(User);
