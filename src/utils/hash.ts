export const getNodeHashFromUsername = (name: string) => {
  let res = 0;
  for (let i = 0; i < name.length; i++) {
    res += name.charCodeAt(i) * Math.pow(11, i + 1);
  }
  return (res % 3) + 1;
};

let BASE_PORT = 3000;
let TOTAL_NODES = 3;

export const getReplicaNodePort = (port: string) => {
  
  let nodeNum = Number(port) - BASE_PORT;
  let nextNum = (nodeNum % TOTAL_NODES) + 1;
  return BASE_PORT + nextNum;
};

export const getPrimaryNodePort=(port: string) =>{
  let nodeNum = Number(port) - BASE_PORT;
  let prevNum = ((nodeNum - 2 + TOTAL_NODES) % TOTAL_NODES) + 1;
  return BASE_PORT + prevNum;
}

