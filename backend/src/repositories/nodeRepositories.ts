import axios from "axios"

export const setDataInCache=async(port:any,{key,value,type}:any)=>{
    const {data} = await axios.post(`http://localhost:${port}/put`,{key,value,type},{ timeout: 3000 })
    return data;
}

export const deleteDataInCache=async (port:any,key:string) => {
    const {data} = await axios.delete(`http://localhost:${port}/delete/${key}`)
    return data
}

export const getDataFromNode=async(port:string,key:string)=>{
    const {data} = await axios.get(`http://localhost:${port}/get/${key}`)
    return data
}
