import {
  Alert,
  AnchorButton,
  Button,
  Callout,
  Classes,
  FormGroup,
  InputGroup,
  Intent,
  IToastProps,
  MenuItem,
  Position,
  Toaster,
} from "@blueprintjs/core";
import * as actions from "../../store/actions/state";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import FormPopup from "../../forms/formPopup";
import {
  DatacenterSelect,
  filterDatacenter,
  FormTypes,
  renderDatacenterItem,
} from "../../forms/formUtils";
import { updateObject } from "../../store/utility";
import { API_ROOT } from "../../utils/api-config";
import {
  AssetType,
  ChangePlan,
  CreateUserObject,
  DatacenterObject,
  ElementObjectType,
  ElementType,
  ModelObject,
  ROUTES,
  ShallowAssetObject,
  SortFilterBody,
} from "../../utils/utils";
import { ALL_DATACENTERS } from "./elementTabContainer";
import ElementTable from "./elementTable";
import {
  FilterTypes,
  IFilter,
  PagingTypes,
  TextFilterTypes,
} from "./elementUtils";
import "./elementView.scss";
import { Link } from "react-router-dom";
import {
  hasAddElementPermission,
  PermissionState,
} from "../../utils/permissionUtils";

// var console: any = {};
// console.log = function() {};
const fs = require("js-file-download");

interface ElementViewState {
  isOpen: boolean;
  filters: Array<any>;
  fileNameIsOpen: boolean;
  fileName: string;
  networkFileName: string;
  updateTable: boolean;
  barcodes: Array<String>;
}
interface ElementViewProps {
  element: ElementType;
  assetType?: AssetType;
  isAdmin: boolean;
  token: string;
  datacenters?: Array<DatacenterObject>;
  currDatacenter?: DatacenterObject;
  onDatacenterSelect?(datacenter: DatacenterObject): void;
  updateDatacenters?(): void;
  updateChangePlans(status: boolean): void;
  isActive?: boolean;
  changePlan: ChangePlan;
  permissionState: PermissionState;
}

type ElementTabProps = ElementViewProps & RouteComponentProps;
class ElementTab extends React.Component<ElementTabProps, ElementViewState> {
  public state: ElementViewState = {
    isOpen: false,
    filters: [],
    fileNameIsOpen: false,
    fileName: "",
    networkFileName: "",
    updateTable: false,
    barcodes: [],
  };

  getExportData = (
    path: string,
    filters: Array<any>,
    token: string,
    file: string,
    networkFile: string
  ) => {
    const config = {
      headers: {
        Authorization: "Token " + token,
      },
    };
    let filtersCopy = filters.slice();
    if (path === "assets") {
      let datacenterName;
      if (this.props.currDatacenter) {
        if (this.props.currDatacenter.name !== ALL_DATACENTERS.name) {
          datacenterName = this.props.currDatacenter.name;
          filtersCopy.push({
            id: "",
            field: "datacenter",
            filter_type: FilterTypes.TEXT,
            filter: {
              value: datacenterName,
              match_type: TextFilterTypes.EXACT,
            },
          });
        }
      }
    }
    const body = {
      sort_by: [],
      filters: filtersCopy,
    };

    axios
      .post(API_ROOT + "api/" + path + "/bulk-export", body, config)
      .then((res) => {
        fs(res.data.export_csv, file);
        return 0;
      })
      .catch((err) => this.addErrorToast("Failed to export data to " + file));

    if (path === "assets") {
      axios
        .post(API_ROOT + "api/" + path + "/network-bulk-export", body, config)
        .then((res) => {
          fs(res.data.export_csv, networkFile);
          return 0;
        })
        .catch((err) => this.addErrorToast("Failed to export data to " + file));
    }
  };
  getPages = (
    path: string,
    page_size: number,
    filters: Array<IFilter>,
    token: string
  ) => {
    const params: any = { page_size };
    if (this.props.changePlan) {
      params["change_plan"] = this.props.changePlan.id;
    }
    const config = {
      headers: {
        Authorization: "Token " + token,
      },

      params: params,
    };
    const filtersCopy = filters.slice();
    let datacenterName;
    if (this.props.currDatacenter) {
      if (this.props.currDatacenter.name !== ALL_DATACENTERS.name) {
        datacenterName = this.props.currDatacenter.name;
        filtersCopy.push({
          id: "",
          field: "datacenter",
          filter_type: FilterTypes.TEXT,
          filter: { value: datacenterName, match_type: TextFilterTypes.EXACT },
        });
      }
    }
    let url =
      this.props.assetType === AssetType.DECOMMISSIONED
        ? "api/assets/pages-decommissioned"
        : this.props.assetType === AssetType.STORED
        ? "api/assets/pages-offline-storage"
        : path === "datacenters" || path === "offline-storage-sites"
        ? "api/sites/" + path + "/pages"
        : "api/" + path + "/pages";
    return axios
      .post(API_ROOT + url, { filters: filtersCopy }, config)
      .then((res) => {
        return res.data.page_count;
      });
  };
  getElementData = (
    path: string,
    page: number,
    page_type: PagingTypes,
    body: SortFilterBody,
    token: string
  ): Promise<Array<ElementObjectType>> => {
    this.handleDataUpdate(false);

    const params: any =
      page_type === PagingTypes.ALL
        ? {}
        : {
            page_size: page_type,
            page,
          };
    if (this.props.changePlan) {
      params["change_plan"] = this.props.changePlan.id;
    }
    const config = {
      headers: {
        Authorization: "Token " + token,
      },

      params: params,
    };
    let bodyCopy = JSON.parse(JSON.stringify(body));
    const { filters } = bodyCopy;
    let datacenterName;
    if (this.props.currDatacenter) {
      if (this.props.currDatacenter.name !== ALL_DATACENTERS.name) {
        datacenterName = this.props.currDatacenter.name;
        filters.push({
          id: "",
          field: "datacenter",
          filter_type: FilterTypes.TEXT,
          filter: { value: datacenterName, match_type: TextFilterTypes.EXACT },
        });
        bodyCopy = updateObject(bodyCopy, { filters });
      }
    }
    let url =
      this.props.assetType === AssetType.DECOMMISSIONED
        ? "api/assets/get-many-decommissioned"
        : this.props.assetType === AssetType.STORED
        ? "api/assets/get-many-offline-storage"
        : path === "datacenters" || path === "offline-storage-sites"
        ? "api/sites/" + path + "/get-many"
        : "api/" + path + "/get-many";
    return axios.post(API_ROOT + url, bodyCopy, config).then((res) => {
      const items = res.data[path];

      return items;
    });
  };

  public handleDataUpdate = (status: boolean) => {
    this.setState({
      updateTable: status,
    });
  };
  private handleOpen = () => {
    this.setState({
      isOpen: true,
    });
  };
  private handleClose = () => this.setState({ isOpen: false });

  private createModel = (model: ModelObject, headers: any): Promise<any> => {
    return axios
      .post(API_ROOT + "api/models/add", model, headers)
      .then((res) => {
        this.handleDataUpdate(true);
        this.handleClose();
        this.addSuccessToast(res.data.success_message);
      });
  };

  private createAsset = (
    asset: ShallowAssetObject,
    headers: any
  ): Promise<any> => {
    let config;
    if (!this.props.changePlan) {
      config = headers;
    } else {
      config = {
        headers: headers["headers"],
        params: {
          change_plan: this.props.changePlan.id,
        },
      };
    }

    return axios
      .post(API_ROOT + "api/assets/add", asset, config)
      .then((res) => {
        this.handleDataUpdate(true);
        this.handleClose();
        if (res.data.warning_message) {
          this.addWarnToast("Created asset. " + res.data.warning_message);
        } else {
          this.addSuccessToast(res.data.success_message);
        }
      });
  };
  private addWarnToast = (message: string) => {
    this.addToast({
      message: message,
      intent: Intent.WARNING,
    });
  };
  componentWillReceiveProps(nextProps: ElementTabProps & RouteComponentProps) {
    if (nextProps.changePlan !== this.props.changePlan) {
      this.handleDataUpdate(true);
    }
  }

  private createDatacenter = (
    dc: DatacenterObject,
    headers: any
  ): Promise<any> => {
    return axios.post(API_ROOT + "api/sites/add", dc, headers).then((res) => {
      this.handleDataUpdate(true);
      this.handleClose();
      this.addSuccessToast(res.data.success_message);
      if (this.props.updateDatacenters) {
        this.props.updateDatacenters();
      }
    });
  };

  private createUser = (user: CreateUserObject, headers: any): Promise<any> => {
    const username = user.username;
    return axios
      .post(API_ROOT + "api/users/add", user, headers)
      .then((res) => {
        this.handleDataUpdate(true);
        this.handleClose();
        this.addSuccessToast("SUCCESS: User " + username + " created.");
      })
      .catch((err) => {
        for (let key in err.response.data) {
          let errors = err.response.data[key];
          errors.forEach((message: string) => {
            this.addErrorToast(message);
          });
        }
      });
  };

  private createChangePlan = (
    changePlan: ChangePlan,
    headers: any
  ): Promise<any> => {
    return axios
      .post(API_ROOT + "api/change-plans/add", changePlan, headers)
      .then((res) => {
        this.props.updateChangePlans(true);

        this.handleDataUpdate(true);
        this.handleClose();

        this.addSuccessToast(res.data.success_message);
      });
  };
  private toaster: Toaster = {} as Toaster;
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

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
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
                    usePortal: true,
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
        {this.props.assetType === AssetType.DECOMMISSIONED ? null : (
          <div className="element-tab-buttons">
            {this.props.element !== ElementType.USER &&
            this.props.element !== ElementType.DATACENTER &&
            this.props.element !== ElementType.OFFLINE_STORAGE_SITE &&
            this.props.element !== ElementType.CHANGEPLANS ? (
              <AnchorButton
                className="add"
                text="Export Table Data"
                disabled={this.props.changePlan ? true : false}
                icon="import"
                minimal
                onClick={() => {
                  /* handle data based on state */
                  this.setState({ fileNameIsOpen: true });
                }}
              />
            ) : (
              <p></p>
            )}
            {this.props.element === ElementType.ASSET ||
            this.props.element === ElementType.MODEL ? (
              <AnchorButton
                disabled={
                  this.props.changePlan
                    ? true
                    : !hasAddElementPermission(
                        this.props.element,
                        this.props.permissionState
                      )
                }
                onClick={() => {
                  this.props.history.push(
                    "/dashboard/bulk-upload/" +
                      (this.props.element === ElementType.MODEL
                        ? "models"
                        : "assets")
                  );
                }}
                className="add"
                icon="export"
                text="Add from CSV file"
                minimal
              />
            ) : null}
            <Alert
              cancelButtonText="Cancel"
              className={Classes.DARK}
              intent={Intent.PRIMARY}
              confirmButtonText="Confirm Export"
              isOpen={this.state.fileNameIsOpen}
              onCancel={() => {
                this.setState({ fileNameIsOpen: false });
              }}
              onConfirm={() => {
                if (
                  this.state.fileName === "" ||
                  (this.state.networkFileName === "" &&
                    this.props.element === ElementType.ASSET) ||
                  (this.state.fileName === "" &&
                    this.props.element === ElementType.MODEL)
                ) {
                  this.addErrorToast("Please provide filenames for both files");
                } else {
                  let fileRegEx = /.*\.(\w+)/;
                  let extension = this.state.fileName.match(fileRegEx);
                  let ext = extension ? extension[extension.length - 1] : null;
                  let networkExtension = this.state.networkFileName.match(
                    fileRegEx
                  );
                  let networkExt = networkExtension
                    ? networkExtension[networkExtension.length - 1]
                    : null;
                  if (
                    (networkExt && (ext !== "csv" || networkExt !== "csv")) ||
                    (!networkExt && ext !== "csv")
                  ) {
                    this.addErrorToast("Filenames must end in .csv");
                  } else if (
                    (networkExt &&
                      (this.state.fileName.split(".")[0].length === 0 ||
                        this.state.networkFileName.split(".")[0].length ===
                          0)) ||
                    (!networkExt &&
                      this.state.fileName.split(".")[0].length === 0)
                  ) {
                    this.addErrorToast(".csv file must have non-empty name");
                  } else {
                    this.getExportData(
                      this.props.element.slice(0, -1) + "s",
                      this.state.filters,
                      this.props.token,
                      this.state.fileName,
                      this.state.networkFileName
                    );

                    this.setState({
                      fileNameIsOpen: false,
                      fileName: "",
                      networkFileName: "",
                    });
                  }
                }
              }}
            >
              <p>
                Please enter a filename ending in ".csv" for the following data:
              </p>
              <FormGroup label={this.props.element + ":"}>
                <InputGroup
                  onChange={(event: any) => {
                    this.setState({ fileName: event.currentTarget.value });
                  }}
                  fill={true}
                  type="text"
                />
              </FormGroup>
              {this.props.element === ElementType.ASSET ? (
                <div>
                  <FormGroup label="network connections:">
                    <InputGroup
                      onChange={(event: any) => {
                        this.setState({
                          networkFileName: event.currentTarget.value,
                        });
                      }}
                      fill={true}
                      type="text"
                    />
                  </FormGroup>
                </div>
              ) : null}
            </Alert>
            <AnchorButton
              className="add"
              text={"Add " + this.props.element.slice(0, -1)}
              icon="add"
              minimal
              intent={Intent.PRIMARY}
              onClick={this.handleOpen}
              disabled={
                this.props.element !== ElementType.ASSET &&
                this.props.changePlan
                  ? true
                  : !hasAddElementPermission(
                      this.props.element,
                      this.props.permissionState
                    )
              }
            />
            {this.props.element === ElementType.ASSET
              ? this.renderBarcodeButton()
              : null}
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
                  : this.props.element === ElementType.CHANGEPLANS
                  ? this.createChangePlan
                  : this.createUser
              }
              isOpen={this.state.isOpen}
              handleClose={this.handleClose}
            />
          </div>
        )}
        <div>
          <ElementTable
            datacenters={this.props.datacenters}
            updateDatacenters={this.props.updateDatacenters}
            type={this.props.element}
            getData={this.getElementData}
            getPages={this.getPages}
            updateBarcodes={(data: Array<string>) => {
              this.setState({
                barcodes: data,
              });
            }}
            callback={(data: Array<any>) => {
              this.setState({ filters: data });
            }}
            shouldUpdateData={this.state.updateTable}
            currDatacenter={this.props.currDatacenter}
            isDecommissioned={this.props.assetType === AssetType.DECOMMISSIONED}
            assetType={this.props.assetType}
          />
        </div>
      </div>
    );
  }
  private renderBarcodeButton() {
    return this.state.barcodes.length === 0 ? (
      <AnchorButton
        className="add"
        text="Print Barcodes for Selected Assets"
        icon="barcode"
        minimal
        disabled={true}
        onClick={() => {}}
      />
    ) : (
      <Link
        target="_blank"
        to={{ pathname: ROUTES.BARCODE_PRINT, state: null }}
      >
        <AnchorButton
          className="add"
          text="Print Barcodes for Selected Assets"
          icon="barcode"
          style={{ color: "white" }}
          minimal
          disabled={this.state.barcodes.length === 0}
          onClick={(e: any) => {
            let barcodes: string;
            barcodes = "";
            for (var i = 0; i < this.state.barcodes.length - 1; i++) {
              barcodes = barcodes + this.state.barcodes[i] + ",";
            }
            barcodes =
              barcodes + this.state.barcodes[this.state.barcodes.length - 1];
            localStorage.setItem("barcodes", barcodes);
          }}
        />
      </Link>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin,
    permissionState: state.permissionState,
    changePlan: state.changePlan,
  };
};
const mapDispatchToProps = (dispatch: any) => {
  return {
    updateChangePlans: (status: boolean) =>
      dispatch(actions.updateChangePlans(status)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(ElementTab);
