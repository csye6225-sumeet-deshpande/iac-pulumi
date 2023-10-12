// const pulumi = require("@pulumi/pulumi");
// const aws = require("@pulumi/aws");
// const awsx = require("@pulumi/awsx");
// const config = new pulumi.Config();

// const awsProfile = config.require("awscli-dev");

// const awsProvider = new aws.Provider("aws-provider", {
//     profile: awsProfile, 
//     region: "us-east-1",
// });
// aws.config = { provider: awsProvider };

// const vpc = new aws.ec2.Vpc("my-vpc", {
//     vpc:`vpc-${pulumi.getStack()}`,
//     cidrBlock: "192.168.0.0/16"
// },{ provider: awsProvider });

// const internetgateway=new aws.ec2.InternetGateway("internet-gateway",{
//     vpcId:vpc.id
// },{ provider: awsProvider })

// const public_subnet=[];
// const private_subnet=[];
// const availabilityZones = aws.getAvailabilityZones({ state: "available" });
// for (let i = 0; i < 3; i++) {
//     const publicSubnet = new aws.ec2.Subnet(`public-subnet-${i}`, {
//         vpcId: vpc.id,
//         cidrBlock: `10.0.${i * 16}.0/24`,
//         availabilityZone: availabilityZones.then(zones => zones.names[i]),
//         mapPublicIpOnLaunch: true,
//     },{ provider: awsProvider });
//     public_subnet.push(publicSubnet);

//     const privateSubnet = new aws.ec2.Subnet(`private-subnet-${i}`, {
//         vpcId: vpc.id,
//         cidrBlock: `10.0.${i * 16 + 8}.0/24`,
//         availabilityZone: availabilityZones.then(zones => zones.names[i]),
//     },{ provider: awsProvider });
//     private_subnet.push(privateSubnet);
// }
// // Export the name of the bucket
// console.log(availabilityZones)
// exports.publicSubnetIds  =  public_subnet;


// const pulumi = require("@pulumi/pulumi");
// const aws = require("@pulumi/aws");
// const config = new pulumi.Config();

// const awsProfile = config.require("awscli-dev");
// const cidrblock=config.require("cidr");

// const vpc = new aws.ec2.Vpc("my-vpc", {
//     tags: {
//         Name: `my-vpc-${pulumi.getStack()}`,
//     },
//     vpc:`vpc-${pulumi.getStack
//     ()}`,
//     cidrBlock: cidrblock,
// });

// const publicSubnetIds = [];
// const privateSubnetIds = [];

// const az=["us-east-1a","us-east-1b","us-east-1c"];
// let a=0;
// for (let i = 1; i <= 3; i++) {
//     const publicSubnet = new aws.ec2.Subnet(`public-subnet-${i}`, {
//         tags: {
//             Name: `public-subnet-${i}`,
//         },
//         vpcId: vpc.id,
//         cidrBlock: `10.0.${i}.0/24`,
//         availabilityZone: az[i-1],
//         mapPublicIpOnLaunch: true,
//     });

//     const privateSubnet = new aws.ec2.Subnet(`private-subnet-${i}`, {
//         vpcId: vpc.id,
//         tags: {
//             Name: `private-subnet-${i}`,
//         },
//         cidrBlock: `10.0.${i + 3}.0/24`,
//         availabilityZone: az[i-1],
//     });

//     publicSubnetIds.push(publicSubnet.id);
//     privateSubnetIds.push(privateSubnet.id);
// }

// const internetGateway = new aws.ec2.InternetGateway("my-igw", {
//     tags: {
//         Name: "Internet Gateway",
//     },
//     internetGateway:"My Internet Gateway",
//     vpcId: vpc.id,
// });

// const publicRouteTable = new aws.ec2.RouteTable("public-route-table", {
//     tags: {
//         Name: "Public-Route-Table",
//     },
//     vpcId: vpc.id,
//     routes: [{
//         cidrBlock: "0.0.0.0/0",
//         gatewayId: internetGateway.id,
//     }],
// });

// const privateRouteTable = new aws.ec2.RouteTable("private-route-table", {
//     tags: {
//         Name: "Private Route Table",
//     },
//     RouteTable:"Private-Route-Table",
//     vpcId: vpc.id,
// });

// for (let i = 0; i < 3; i++) {
//     new aws.ec2.RouteTableAssociation(`public-subnet-association-${i}`, {
//         subnetId: publicSubnetIds[i],
//         routeTableId: publicRouteTable.id,
//     });

//     new aws.ec2.RouteTableAssociation(`private-subnet-association-${i}`, {
//         subnetId: privateSubnetIds[i],
//         routeTableId: privateRouteTable.id,
//     });
// }


// exports.vpcId = vpc.id;
// exports.publicSubnetIds = publicSubnetIds;
// exports.privateSubnetIds = privateSubnetIds;
// exports.internetGatewayId = internetGateway.id;
// exports.publicRouteTableId = publicRouteTable.id;
// exports.privateRouteTableId = privateRouteTable.id;

const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const config = new pulumi.Config();


const cidrblock=config.require("cidr");
const count=config.require("total_count");
const vpc_name=config.require("vpc_name");
const ig_name=config.require("ig_name");
const public_route_table=config.require("public_route_table")
const private_route_table=config.require("private_route_table")
const public_subnet=config.require("public_subnet")
const private_subnet = config.require("private_subnet")

const vpc = new aws.ec2.Vpc(vpc_name, {
    cidrBlock: cidrblock, 
    tags: {
        Name: vpc_name,
    },
});

const publicSubnetIds = [];
const privateSubnetIds = [];

const availableZones = aws.getAvailabilityZones({ state: "available" });


availableZones.then(azs => {
    for (let i = 0; i < count; i++) {
        const az = azs.names[i];
        const publicSubnetCIDR = `${cidrblock.split(".")[0]}.${cidrblock.split(".")[1]}.${i}.0/24`;
        const privateSubnetCIDR = `${cidrblock.split(".")[0]}.${cidrblock.split(".")[1]}.${i + 3}.0/24`;
        const publicSubnet = new aws.ec2.Subnet(`${public_subnet}-${i + 1}`, {
            vpcId: vpc.id,
            cidrBlock: publicSubnetCIDR,
            availabilityZone: az,
            mapPublicIpOnLaunch: true,
            tags: {
                Name: `${public_subnet}-${i + 1}`,
            },
        });

        const privateSubnet = new aws.ec2.Subnet(`${private_subnet}-${i + 1}`, {
            vpcId: vpc.id,
            cidrBlock: privateSubnetCIDR,
            availabilityZone: az,
            tags: {
                Name: `${private_subnet}-${i + 1}`,
            },
        });

        publicSubnetIds.push(publicSubnet.id);
        privateSubnetIds.push(privateSubnet.id);
    }

    const internetGateway = new aws.ec2.InternetGateway(ig_name, {
        vpcId: vpc.id,
        tags: {
            Name: ig_name,
        },
    });

    const publicRouteTable = new aws.ec2.RouteTable(public_route_table, {
        vpcId: vpc.id,
        routes: [{
            cidrBlock: "0.0.0.0/0",
            gatewayId: internetGateway.id,
        }],
        tags: {
            Name: public_route_table,
        },
    });

    const privateRouteTable = new aws.ec2.RouteTable(private_route_table, {
        vpcId: vpc.id,
        tags: {
            Name: private_route_table,
        },
    });

    for (let i = 0; i < 3; i++) {
        new aws.ec2.RouteTableAssociation(`public-subnet-association-${i}`, {
            subnetId: publicSubnetIds[i],
            routeTableId: publicRouteTable.id,
        });

        new aws.ec2.RouteTableAssociation(`private-subnet-association-${i}`, {
            subnetId: privateSubnetIds[i],
            routeTableId: privateRouteTable.id,
        });
    }

    exports.vpcId = vpc.id;
    exports.publicSubnetIds = publicSubnetIds;
    exports.privateSubnetIds = privateSubnetIds;
    exports.internetGatewayId = internetGateway.id;
    exports.publicRouteTableId = publicRouteTable.id;
    exports.privateRouteTableId = privateRouteTable.id;
});
