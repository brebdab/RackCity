import * as React from "react";


import {Cell, Column,Table } from "@blueprintjs/table";

import "@blueprintjs/core/lib/css/blueprint.css";
import {  Tab, Tabs, Classes, NonIdealState } from "@blueprintjs/core";
import './elementView.scss';
//import { Classes} from "@blueprintjs/core";
import { useState, useEffect,useMemo } from "react";
import axios, { AxiosResponse } from 'axios';
import { ENGINE_METHOD_NONE } from "constants";
import { constants } from "crypto";


export interface ElementViewProps { 
    
}

export class ElementView extends React.PureComponent<ElementViewProps> {
    public render() {
        return (

            <Tabs
             className = {Classes.DARK}
            animate= {true}
            id="ElementViewer"
            key={"vertical"}
            renderActiveTabPanelOnly={false}
            vertical={true}
        >
            <Tab className="tab" id="instance" title="Instances" panel={<ElementTable getData = {getModels} />} />
            <Tab  className="tab"id="model" title="Models" panel={<ElementTable getData = {getModels} />} />
            <Tab  className="tab"id="rack" title="Racks" />
            <Tabs.Expander />
            {/* <InputGroup className={Classes.FILL} type="text" placeholder="Search..." /> */}
        </Tabs>



         );
    }
}
interface ElementTableState {
    columns: Array<string>,
    data:  any,

}
interface ElementTableProps {
    getData() : Promise<{
        cols: string[][];
        data: any;
    }>


}

async function getModels(){
    return await axios.get('https://rack-city-dev.herokuapp.com/api/models/').then(res => {
        console.log("test")
        const data = res.data;
        const cols : Array<Array<string>> = data.map((item: any)=> {
            console.log(Object.keys(item));
            return Object.keys(item);     

        });
        return {cols,data}

     
    });
}
export class ElementTable extends React.Component<ElementTableProps, ElementTableState>{
  
   
       public state: ElementTableState = { 
            columns : [],
            data: [],

        
    }
       

    
    
    async componentDidMount(){

  
   const resp = await this.props.getData();
    
        console.log(resp.cols[0])
        this.setState({
            columns: resp.cols[0],
   
            data : resp.data
    }
    
        );


      
    }
    public render(){
        console.log("render")
        console.log(this.state.columns)
    
        return (
            <div className = "ElementTable">
           <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered">
                <thead>
                {this.state.columns.map((col:string) => {
                    console.log((col)) 
                    return (<th>{col}</th>);


                })
            }

                </thead>
            <tbody>
            
               
               {
                   this.state.data.map((item:any)=>
              
                   {
                    return <tr>
                       {this.state.columns.map((col:string) => {
                       return <td>{item[col]}</td>
                   })
                }
                
                   </tr>
                   })



               }
         
            </tbody>
        </table> 
        </div>
 

        )
        

    }
    cellRenderer = (rowID:number,colID:number )=>{
        const item = this.state.data[rowID];
        
        const col = this.state.columns[colID]
        let val = '';
        for (let index = 0; index < this.state.columns.length; index++){
            const colName = this.state.columns[index];
            if(index === colID){
                val = item[colName]
            }
        }

        

        
        // const {id, title,content} = item; 
        // if (colID ===0){
        //     val = id       
        //   }
        //   if (colID ===1){
        //       val = title
        //   }
        //   else{
        //       val= content
        //   }
          
          console.log(colID,rowID,val)
        return <Cell>{val}</Cell>
    }
}


const TableExample: React.FunctionComponent<{}> = () => (
    <Table 
        numRows={5}
    >
        <Column name = "test"/>

        
        </Table>
 

);




    // // data state to store the TV Maze API data. Its initial value is an empty array
    // const [data, setData] = useState([]);
  
    // // Using useEffect to call the API once mounted and set the data
    // useEffect(() => {
    //   (async () => {
    //     const result = await axios("https://api.tvmaze.com/search/shows?q=snow");
    //     setData(result.data);
    //   })();
    // }, []);

    // const columns = useMemo(
    //     () => [
    //       {
    //         // first group - TV Show
    //         Header: "TV Show",
    //         // First group columns
    //         columns: [
    //           {
    //             Header: "Name",
    //             accessor: "show.name"
    //           },
    //           {
    //             Header: "Type",
    //             accessor: "show.type"
    //           }
    //         ]
    //       },
    //       {
    //         // Second group - Details
    //         Header: "Details",
    //         // Second group columns
    //         columns: [
    //           {
    //             Header: "Language",
    //             accessor: "show.language"
    //           },
    //           {
    //             Header: "Genre(s)",
    //             accessor: "show.genres"
    //           },
    //           {
    //             Header: "Runtime",
    //             accessor: "show.runtime"
    //           },
    //           {
    //             Header: "Status",
    //             accessor: "show.status"
    //           }
    //         ]
    //       }
    //     ],
    //     []
    //   );
  



export default ElementView
