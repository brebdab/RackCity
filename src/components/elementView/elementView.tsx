import {
  Alignment,
  AnchorButton,
  Classes,
  Navbar,
  NavbarGroup,
  NavbarHeading
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../../api-config";
import FormPopup from "../../forms/FormPopup";
import { FormTypes } from "../../forms/modelForm";
import {
  ElementObjectType,
  ElementType,
  ModelObject,
  InstanceInfoObject
} from "../utils";
import ElementTable from "./elementTable";
import "./elementView.scss";

interface ElementViewState {
  isOpen: boolean;
}
interface ElementViewProps {
  element: ElementType;
  isAdmin: boolean;
}

export function getElementData(
  path: string,
  token: string
): Promise<Array<ElementObjectType>> {
  console.log(API_ROOT + "api/" + path + "/get-many");

  const page_size = 100;
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

  private createModel = (model: ModelObject, headers: any): Promise<any> => {
    return axios.post(API_ROOT + "api/models/add", model, headers).then(res => {
      console.log("success");
      this.handleClose();
      console.log(this.state.isOpen);
    });
  };

  private createInstance = (
    instance: InstanceInfoObject,
    headers: any
  ): Promise<any> => {
    console.log("api/instances/add");
    return axios
      .post(API_ROOT + "api/instances/add", instance, headers)
      .then(res => {
        console.log("success");
        this.handleClose();
        console.log(this.state.isOpen);
      });
  };

  public render() {
    return (
      <div>
        <Navbar className={Classes.DARK}>
          <NavbarGroup>
            <NavbarHeading>{this.props.element}</NavbarHeading>
          </NavbarGroup>
          {this.props.isAdmin ? (
            <NavbarGroup align={Alignment.RIGHT}>
              <AnchorButton
                className="add"
                text={"Add " + this.props.element.slice(0, -1)}
                icon="add"
                onClick={this.handleOpen}
              />
              <FormPopup
                type={FormTypes.CREATE}
                elementName={this.props.element}
                submitForm={
                  this.props.element === ElementType.MODEL
                    ? this.createModel
                    : this.createInstance
                }
                isOpen={this.state.isOpen}
                handleClose={this.handleClose}
              />
            </NavbarGroup>
          ) : null}
        </Navbar>
        <div className="element-table">
          <ElementTable type={this.props.element} getData={getElementData} />
        </div>
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
