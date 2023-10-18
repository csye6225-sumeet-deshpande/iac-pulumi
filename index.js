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
const keyName=config.require("keyName")
const instanceType=config.require("instanceType")
const ami =config.require("ami")
const volumeSize=config.require("volumeSize")
const volumeType=config.require("volumeType")
const ingressRules = new pulumi.Config().getObject("ingressRules")
const subnetMask = new pulumi.Config().getObject("subnetMask");


const vpc = new aws.ec2.Vpc(vpc_name, {
    cidrBlock: `${cidrblock}`, 
    tags: {
        Name: vpc_name,
    },
});

const publicSubnetIds = [];
const privateSubnetIds = [];

const availableZones = aws.getAvailabilityZones({ state: "available" });
let created_count= 0;

availableZones.then(azs => {
    created_count=Math.min(azs.names.length,count);
    for (let i = 0; i < Math.min(count,azs.names.length); i++) {
        console.log("@@@@@@@@@@@@@@@@@@@@@@@!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",azs.names.length);
        const az = azs.names[i];
        const publicSubnetCIDR = `${cidrblock.split(".")[0]}.${cidrblock.split(".")[1]}.${i}.0/${subnetMask}`;
        const privateSubnetCIDR = `${cidrblock.split(".")[0]}.${cidrblock.split(".")[1]}.${i + 3}.0/${subnetMask}`;
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

    for (let i = 0; i < created_count; i++) {
        new aws.ec2.RouteTableAssociation(`public-subnet-association-${i}`, {
            subnetId: publicSubnetIds[i],
            routeTableId: publicRouteTable.id,
        });

        new aws.ec2.RouteTableAssociation(`private-subnet-association-${i}`, {
            subnetId: privateSubnetIds[i],
            routeTableId: privateRouteTable.id,
        });
    }


    
const ApplicationSecurityGroup = new aws.ec2.SecurityGroup("ApplicationSecurityGroup", {
    vpcId: vpc.id,  
    tags: {
        Name: "Secuirty Group Pulumi",
    },
    ingress: ingressRules,
});


const webAppInstance = new aws.ec2.Instance("webAppInstance", {
    ami: ami,  
    instanceType: instanceType, 
    subnetId: publicSubnetIds[0],  
    securityGroups: [ApplicationSecurityGroup.id],
    keyName: keyName,
    rootBlockDevice: {
        volumeSize: volumeSize,  
        volumeType: volumeType, 
        deleteOnTermination:true,
    },
    disableApiTermination:false,
    tags: {
        Name: "EC2 Web APP",
    },
});




    exports.vpcId = vpc.id;
    exports.publicSubnetIds = publicSubnetIds;
    exports.privateSubnetIds = privateSubnetIds;
    exports.internetGatewayId = internetGateway.id;
    exports.publicRouteTableId = publicRouteTable.id;
    exports.privateRouteTableId = privateRouteTable.id;
    exports.instanceId = webAppInstance.id;
});
