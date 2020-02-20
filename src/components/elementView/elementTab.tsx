import {
  Alert,
  AnchorButton,
  InputGroup,
  Intent,
  IToastProps,
  Position,
  Toaster,
  FormGroup,
  MenuItem,
  Button,
  Callout
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import FormPopup from "../../forms/formPopup";
import {
  FormTypes,
  DatacenterSelect,
  renderDatacenterItem,
  filterDatacenter
} from "../../forms/formUtils";
import { API_ROOT } from "../../utils/api-config";
import {
  ShallowAssetObject,
  CreateUserObject,
  ElementObjectType,
  ElementType,
  ModelObject,
  DatacenterObject,
  SortFilterBody
} from "../../utils/utils";
import ElementTable from "./elementTable";
import "./elementView.scss";
import {
  IFilter,
  PagingTypes,
  FilterTypes,
  TextFilterTypes
} from "./elementUtils";
import { updateObject } from "../../store/utility";
import { ALL_DATACENTERS } from "./elementTabContainer";

// var console: any = {};
// console.log = function () { };
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
  datacenters?: Array<DatacenterObject>;
  currDatacenter?: DatacenterObject;
  onDatacenterSelect?(datacenter: DatacenterObject): void;
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

type ElementTabProps = ElementViewProps & RouteComponentProps;
class ElementTab extends React.Component<ElementTabProps, ElementViewState> {
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
    body: SortFilterBody,
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
    let bodyCopy = JSON.parse(JSON.stringify(body));
    const { filters } = bodyCopy;
    let datacenterName;
    if (this.props.currDatacenter) {
      if (this.props.currDatacenter.name !== ALL_DATACENTERS.name) {
        datacenterName = this.props.currDatacenter.name;
        filters.push({
          id: "",
          field: "rack__datacenter__name",
          filter_type: FilterTypes.TEXT,
          filter: { value: datacenterName, match_type: TextFilterTypes.EXACT }
        });
        bodyCopy = updateObject(bodyCopy, { filters });
      }
    }

    return axios
      .post(API_ROOT + "api/" + path + "/get-many", bodyCopy, config)
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
      this.addSuccessToast("Successfully created model!");
      console.log(this.state.isOpen);
    });
  };

  private createAsset = (
    asset: ShallowAssetObject,
    headers: any
  ): Promise<any> => {
    console.log("api/assets/add");
    return axios.post(API_ROOT + "api/assets/add", asset, headers).then(res => {
      this.handleDataUpdate(true);
      this.handleClose();
      this.addSuccessToast("Successfully created asset!");

      console.log(this.state.isOpen);
    });
  };

  private createDatacenter = (
    dc: DatacenterObject,
    headers: any
  ): Promise<any> => {
    console.log("api/dataceneters/add");
    return axios
      .post(API_ROOT + "api/datacenters/add", dc, headers)
      .then(res => {
        this.handleDataUpdate(true);
        this.handleClose();
        this.addSuccessToast("Successfully created datacenter!");
        console.log(this.state.isOpen);
      });
  };

  private createUser = (user: CreateUserObject, headers: any): Promise<any> => {
    console.log("api/users/add");
    return axios.post(API_ROOT + "api/users/add", user, headers).then(res => {
      console.log("success");

      this.handleDataUpdate(true);
      this.handleClose();
      this.addSuccessToast("Successfully created user!");
      console.log(this.state.isOpen);
    });
  };
  private addSuccessToast(message: string) {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  }
  private addErrorToast(message: string) {
    this.addToast({ message: message, intent: Intent.DANGER });
  }
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }
  private toaster: Toaster = {} as Toaster;
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  public render() {
    return (
      <div className="element-tab">
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        <div>
          {this.props.datacenters && this.props.onDatacenterSelect ? (
            <Callout>
              <FormGroup label="Datacenter" inline={true}>
                <DatacenterSelect
                  popoverProps={{
                    minimal: true,
                    popoverClassName: "dropdown",
                    usePortal: true
                  }}
                  items={this.props.datacenters!}
                  onItemSelect={(datacenter: DatacenterObject) => {
                    this.props.onDatacenterSelect!(datacenter);
                  }}
                  itemRenderer={renderDatacenterItem}
                  itemPredicate={filterDatacenter}
                  noResults={<MenuItem disabled={true} text="No results." />}
                >
                  <Button
                    rightIcon="caret-down"
                    text={
                      this.props.currDatacenter &&
                        this.props.currDatacenter.name
                        ? this.props.currDatacenter.name
                        : "All datacenters"
                    }
                  />
                </DatacenterSelect>
              </FormGroup>
            </Callout>
          ) : null}
        </div>

        <div className="element-tab-buttons">
          {this.props.element !== ElementType.USER &&
            this.props.element !== ElementType.DATACENTER ? (
              <AnchorButton
                className="add"
                text="Export Table Data"
                icon="import"
                minimal
                onClick={() => {
                  /* handle data based on state */
                  this.setState({ fileNameIsOpen: true });
                  console.log(this.state.filters);
                }}
              />
            ) : (
              <p></p>
            )}
          {this.props.isAdmin &&
            this.props.element !== ElementType.USER &&
            this.props.element !== ElementType.DATACENTER ? (
              <AnchorButton
                onClick={() => {
                  this.props.history.push("/bulk-upload/" +
                    (this.props.element === ElementType.MODEL ? "models" : "assets")
                  )
                }}
                className="add"
                icon="export"
                text="Add from CSV file"
                minimal
              />
            ) : null}

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
              Please enter a file name ending in ".csv" under which to export
              this data
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
            <AnchorButton
              className="add"
              text={"Add " + this.props.element.slice(0, -1)}
              icon="add"
              minimal
              intent={Intent.PRIMARY}
              onClick={this.handleOpen}
            />
          ) : null}
          <FormPopup
            {...this.props}
            type={FormTypes.CREATE}
            elementName={this.props.element}
            submitForm={
              this.props.element === ElementType.MODEL
                ? this.createModel
                : this.props.element === ElementType.ASSET
                  ? this.createAsset
                  : this.props.element === ElementType.DATACENTER
                    ? this.createDatacenter
                    : this.createUser
            }
            isOpen={this.state.isOpen}
            handleClose={this.handleClose}
          />
        </div>

        <div>
          <ElementTable
            type={this.props.element}
            getData={this.getElementData}
            getPages={getPages}
            callback={(data: Array<any>) => {
              this.setState({ filters: data });
            }}
            shouldUpdateData={this.state.updateTable}
            disableSorting={
              this.props.element === ElementType.USER ||
              this.props.element === ElementType.DATACENTER
            }
            disableFiltering={
              this.props.element === ElementType.USER ||
              this.props.element === ElementType.DATACENTER
            }
            currDatacenter={this.props.currDatacenter}
          />
        </div>
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: true /* state.admin */ //TODO: REMOVE!
  };
};
export default connect(mapStateToProps)(ElementTab);
