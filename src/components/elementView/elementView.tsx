import { AnchorButton, Intent, Alert, InputGroup } from "@blueprintjs/core";
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
import { IFilter } from "./filterSelectView";

const fs = require("js-file-download");

interface ElementViewState {
  isOpen: boolean;
  filters: Array<any>;
  fileNameIsOpen: boolean;
  fileName: string;
  updateTable: boolean;
}
interface ElementViewProps {
  element: ElementType;
  isAdmin: boolean;
  token: string;
}
export function getPages(
  path: string,
  page_size: number,
  filters: Array<IFilter>,
  token: string
) {
  const config = {
    headers: {
      Authorization: "Token " + token
    },

    params: {
      page_size
    }
  };
  return axios
    .post(API_ROOT + "api/" + path + "/pages", { filters }, config)
    .then(res => {
      return res.data.page_count;
    });
}

async function getExportData(
  path: string,
  filters: Array<any>,
  token: string,
  file: string
) {
  const config = {
    headers: {
      Authorization: "Token " + token
    }
  };
  const params = {
    sort_by: [],
    filters: filters
  };
  return axios
    .post(API_ROOT + "api/" + path + "/bulk-export", params, config)
    .then(res => {
      console.log(res.data);
      fs(res.data.export_csv, file);
      return 0;
    });
}

class ElementView extends React.Component<ElementViewProps, ElementViewState> {
  public state: ElementViewState = {
    isOpen: false,
    filters: [],
    fileNameIsOpen: false,
    fileName: "",
    updateTable: false
  };
  getElementData = (
    path: string,
    page: number,
    page_type: PagingTypes,
    body: any,
    token: string
  ): Promise<Array<ElementObjectType>> => {
    console.log(API_ROOT + "api/" + path + "/get-many");
    this.handleDataUpdate(false);

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
      });
  };

  public handleDataUpdate = (status: boolean) => {
    this.setState({
      updateTable: status
    });
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
      this.handleDataUpdate(true);
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
        this.handleDataUpdate(true);
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
          onClick={() => {
            /* handle data based on state */
            this.setState({ fileNameIsOpen: true });
            console.log(this.state.filters);
          }}
        />
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Confirm file name"
          isOpen={this.state.fileNameIsOpen}
          onCancel={() => {
            this.setState({ fileNameIsOpen: false });
          }}
          onConfirm={() => {
            if (this.state.fileName === "") {
              alert("need file name");
            } else if (this.state.fileName.split(".")[1] !== "csv") {
              alert("ERROR: Must be csv file");
            } else if (this.state.fileName.split(".")[0].length === 0) {
              alert("ERROR: .csv file must have non-empty name");
            } else {
              getExportData(
                this.props.element.slice(0, -1) + "s",
                this.state.filters,
                this.props.token,
                this.state.fileName
              );
              this.setState({ fileNameIsOpen: false, fileName: "" });
            }
          }}
        >
          <p>
            Please enter a file name ending in ".csv" under which to export this
            data
          </p>
          <InputGroup
            onChange={(event: any) => {
              this.setState({ fileName: event.currentTarget.value });
            }}
            fill={true}
            type="text"
          />
        </Alert>
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
            getData={this.getElementData}
            getPages={getPages}
            callback={(data: Array<any>) => {
              this.setState({ filters: data });
            }}
            shouldUpdateData={this.state.updateTable}
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
