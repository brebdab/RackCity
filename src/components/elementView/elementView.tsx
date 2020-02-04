import { AnchorButton, Intent } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../../api-config";
import FormPopup from "../../forms/FormPopup";
import { FormTypes } from "../../forms/formUtils";
import {
  ElementObjectType,
  ElementType,
  InstanceInfoObject,
  ModelObject
} from "../utils";
import ElementTable, { PagingTypes } from "./elementTable";
import "./elementView.scss";

interface ElementViewState {
  isOpen: boolean;
  filters: Array<any>
}
interface ElementViewProps {
  element: ElementType;
  isAdmin: boolean;
  token: string
}
export function getPages(path: string, page_size: number, token: string) {
  const config = {
    headers: {
      Authorization: "Token " + token
    },

    params: {
      page_size
    }
  };
  return axios.get(API_ROOT + "api/" + path + "/pages", config).then(res => {
    return res.data.page_count;
  });
}

export function getElementData(
  path: string,
  page: number,
  page_type: PagingTypes,
  body: any,
  token: string
): Promise<Array<ElementObjectType>> {
  console.log(API_ROOT + "api/" + path + "/get-many");
  const params =
    page_type === PagingTypes.ALL
      ? {}
      : {
          page_size: page_type,
          page
        };
  const config = {
    headers: {
      Authorization: "Token " + token
    },

    params: params
  };
  return axios
    .post(API_ROOT + "api/" + path + "/get-many", body, config)
    .then(res => {
      const items = res.data[path];

      return items;
    })
    .catch(err => console.log(err));
}

async function getExportData(path: string, filters: Array<any>, token: string) {
  const config = {
    headers: {
      Authorization: "Token " + token
    }
  }
  const params = {
    sort_by: [],
    filters: filters
  }
  return axios.post(API_ROOT + "api/" + path + "/bulk-export", params, config).then(res => {
    console.log(res.data)
  })
}

class ElementView extends React.Component<ElementViewProps, ElementViewState> {
  public state: ElementViewState = {
    isOpen: false,
    filters: []
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
        <AnchorButton
          className="add"
          text="Export Bulk"
          icon="import"
          onClick={async () => {
            /* handle data based on state */
            await getExportData(this.props.element.slice(0, -1) + "s", this.state.filters, this.props.token)
            console.log(this.state.filters)
          }}
        />
        {this.props.isAdmin ? (
          <div>
            <AnchorButton
              className="add"
              text={"Add " + this.props.element.slice(0, -1)}
              icon="add"
              minimal
              intent={Intent.PRIMARY}
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
          </div>
        ) : null}

        <div>
          <ElementTable
            type={this.props.element}
            getData={getElementData}
            getPages={getPages}
            callback={(data: Array<any>) => { this.setState( {filters: data} ) }}
          />
        </div>
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};
export default connect(mapStateToProps)(ElementView);
