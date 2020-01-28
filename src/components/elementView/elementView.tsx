import { AnchorButton, Classes, Dialog } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../api-config";
import WrappedCreateModelForm from "../../forms/createModelForm";
import InstanceTable from "./instanceTable";
import ModelTable from "./modelTable";
import "./elementView.scss";
import { connect } from "react-redux";
import {
  InstanceObject,
  ElementType,
  ModelObject,
  ElementObjectType
} from "../utils";

interface ElementViewState {
  isOpen: boolean;
}
interface ElementViewProps {
  element: string;
  isAdmin: boolean;
}
function getInstanceData(token: string): Promise<Array<InstanceObject>> {
  console.log(
    getElementData(ElementType.INSTANCE, token) as Promise<
      Array<InstanceObject>
    >
  );
  return getElementData(ElementType.INSTANCE, token) as Promise<
    Array<InstanceObject>
  >;
}
function getModelData(token: string): Promise<Array<ModelObject>> {
  return getElementData(ElementType.MODEL, token) as Promise<
    Array<ModelObject>
  >;
}
function getElementData(
  path: string,
  token: string
): Promise<Array<ElementObjectType>> {
  console.log(API_ROOT + "api/" + path + "get-many");

  const page_size = 30;
  const page = 1;

  const config = {
    headers: {
      Authorization: "Token " + token
    },
    params: {
      page_size,
      page
    }
  };
  console.log(config);
  return axios
    .post(API_ROOT + "api/" + path + "/get-many", {}, config)
    .then(res => {
      const items = res.data[path];

      return items;
    })
    .catch(err => console.log(err));
}
class ElementView extends React.Component<ElementViewProps, ElementViewState> {
  public state: ElementViewState = {
    isOpen: false
  };

  private handleOpen = () => {
    this.setState({
      isOpen: true
    });
  };

  private handleClose = () => this.setState({ isOpen: false });
  public render() {
    console.log(this.props.element);
    return (
      <div>
        {this.props.isAdmin
          ? [
              <AnchorButton
                text={"Add " + this.props.element.slice(0, -1)}
                icon="add"
                onClick={this.handleOpen}
              />,
              <Dialog
                className={Classes.DARK}
                usePortal={true}
                enforceFocus={true}
                canEscapeKeyClose={true}
                canOutsideClickClose={true}
                isOpen={this.state.isOpen}
                onClose={this.handleClose}
                title={"Add " + this.props.element.slice(0, -1)}
              >
                {this.props.element === "models" ? (
                  <WrappedCreateModelForm />
                ) : null}
              </Dialog>
            ]
          : null}
        {this.props.element === ElementType.MODEL ? (
          <ModelTable getData={getModelData} />
        ) : (
          <InstanceTable getData={getInstanceData} />
        )}
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    isAdmin: state.admin
  };
};
export default connect(mapStateToProps)(ElementView);
