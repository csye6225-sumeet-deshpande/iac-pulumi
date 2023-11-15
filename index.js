const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const { rds } = require("@pulumi/aws/types/enums");
const { TargetGroup } = require("@pulumi/aws/alb");
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
const username = config.require('dbUsername');
const password = config.require('dbPassword');
const dbName=config.require('dbName');
const rdsIdentifier=config.require('rdsIdentifier');
const instanceClass=config.require('instanceClass');
const userCSVPATH=config.require('userCSVPATH');
const zonedID=config.require('zonedID')
const domainName=config.require('domainName')





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

 const lbSg = new aws.ec2.SecurityGroup("lb_sg", {
        name: "load balancer",
        description: "Allow TLS inbound traffic",
        vpcId: vpc.id,
    
        ingress: [
            {
                description: "https from Anywhere",
                fromPort: 443,
                toPort: 443,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"],
            },
            {
                description: "http from anywhere",
                fromPort: 80,
                toPort: 80,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
    
        egress: [
            {
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
    
        tags: {
            Name: "load balancer",
        },
    });
    
const ApplicationSecurityGroup = new aws.ec2.SecurityGroup("ApplicationSecurityGroup", {
    vpcId: vpc.id,  
    tags: {
        Name: "Secuirty Group Pulumi",
    },
     ingress : [
        {
            protocol: "tcp",
            fromPort: 22,
            toPort: 22,
            securityGroups: [lbSg.id],
        },
        {
            protocol: "tcp",
            fromPort: 9090,
            toPort: 9090,
            securityGroups: [lbSg.id],
        },
      
    ],
    egress: [
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"]
        }
    ],
});



const databaseSecurityGroup = new aws.ec2.SecurityGroup("databasesecuritysroupname", {
    description: "Database Security Group",
    vpcId: vpc.id, 
    ingress: [
        {
            protocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
            securityGroups: [ApplicationSecurityGroup.id], 

        },
      
    ],
    egress: [
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"]
        }
    ],
  
});

const databaseParameterGroup= new aws.rds.ParameterGroup("databaseparametergroup",{
    family: "postgres15"
});

const postgresqlSubnetGroup = new aws.rds.SubnetGroup("postgresql_subnet_group", {
name: "postgresubgroup",
vpcId: vpc.id,  
subnetIds: [
    privateSubnetIds[0],
    privateSubnetIds[1],
],
tags: {
    Name: "PostgreSQL subnet group",
},
});

const rdsDatabase = new aws.rds.Instance("rdsdatabase",{
engine:"postgres",
identifier: rdsIdentifier,
vpcId:vpc.id,
allocatedStorage:20,
engineVersion:15,
publiclyAccessible:false,   
instanceClass: instanceClass,
dbSubnetGroupName: postgresqlSubnetGroup.name,
parameterGroupName:databaseParameterGroup,
vpcSecurityGroupIds:[databaseSecurityGroup.id],
multiAz:false,
subnetId: privateSubnetIds[1],
skipFinalSnapshot:true,
name: dbName,
username: username, 
password: password,
})




let role = new aws.iam.Role("role", {
assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
        Action: "sts:AssumeRole",
        Principal: {
            Service: "ec2.amazonaws.com"
        },
        Effect: "Allow",
    }]
})
})


let policyAttachment = new aws.iam.RolePolicyAttachment("policyAttachment", {
role: role.name,
policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy" 
})

let instanceProfile = new aws.iam.InstanceProfile("myInstanceProfile", {
role: role.name
});




const userDataTemplate = pulumi.interpolate`#!/bin/bash
cd /opt/csye6225
sudo rm .env
sudo touch .env
echo PGPORT=5432 >> /opt/csye6225/.env
echo PGUSER=${username} >> /opt/csye6225/.env
echo PGPASSWORD=${password} >> /opt/csye6225/.env
echo PGDATABASE=${dbName} >> /opt/csye6225/.env
echo CSVPATH=${userCSVPATH} >> /opt/csye6225/.env
echo PGHOST=${rdsDatabase.address} >> /opt/csye6225/.env
sudo systemctl restart webapp
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
-a fetch-config \
-m ec2 \
-c file:/opt/csye6225/aws_cw_config.json \
-s
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent`;


// const userDataTemplate =pulumi.interpolate`#!/bin/bash
// cd /opt/csye6225
// sudo rm .env
// sudo touch .env
// echo PGPORT=5432 >> /opt/csye6225/.env
// echo PGUSER=${username} >> /opt/csye6225/.env
// echo PGPASSWORD=${password} >> /opt/csye6225/.env
// echo PGDATABASE=${dbName} >> /opt/csye6225/.env
// echo CSVPATH=${userCSVPATH} >> /opt/csye6225/.env
// echo PGHOST=${rdsDatabase.address} >> /opt/csye6225/.env
// sudo systemctl restart webapp
// sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
// -a fetch-config \
// -m ec2 \
// -c file:/opt/csye6225/aws_cw_config.json \
// -s
// sudo systemctl enable amazon-cloudwatch-agent
// sudo systemctl start amazon-cloudwatch-agent`;

// const userData = pulumi.interpolate`${pulumi.output(userDataTemplate)}`;
// const encodedUserData = pulumi.all([userData]).apply(([userData]) => Buffer.from(userData).toString('base64'));

// const encodedUserData = Buffer.from(userDataTemplate).toString("base64");


const launchtemplate = new aws.ec2.LaunchTemplate("launchtemplate", {
name: "asg_launch_config",
imageId: ami,
// instanceInitiatedShutdownBehavior: "terminate",
instanceType: instanceType,
keyName: keyName,
disableApiTermination: false,
dependsOn: [rdsDatabase],

iamInstanceProfile: {
    name: instanceProfile.name,
},

blockDeviceMappings: [
    {
        deviceName: "/dev/xvda",
        ebs: {
            deleteOnTermination: true,
            volumeSize: volumeSize,
            volumeType: volumeType,
        },
    },
],

networkInterfaces: [
    {
        associatePublicIpAddress: true,
        deleteOnTermination: true,
        securityGroups: [ApplicationSecurityGroup.id],
    },
],

tagSpecifications: [
    {
        resourceType: "instance",
        tags: {
            Name: "csye6225_asg",
        },
    },
],

userData: userDataTemplate.apply((data) => Buffer.from(data).toString("base64")),
});

const loadbalncer = new aws.lb.LoadBalancer("webAppLB", {
    name: "csye6225-lb",
    internal: false,
    loadBalancerType: "application",
    securityGroups: [lbSg.id],
    subnets: publicSubnetIds,
    enableDeletionProtection: false,
    tags: {
        Application: "WebApp",
    },
});

const targetGroup = new aws.lb.TargetGroup("webAppTargetGroup", {
    name: "csye6225-lb-tg",
    port: 9090,
    protocol: "HTTP",
    vpcId: vpc.id,
    targetType: "instance",
    healthCheck: {
        enabled: true,
        path: "/healthz",
        port: "traffic-port",
        protocol: "HTTP",
        healthyThreshold: 2,
        unhealthyThreshold: 2,
        timeout: 6,
        interval: 30,
    },
});

const listener = new aws.lb.Listener("webAppListener", {
    loadBalancerArn: loadbalncer.arn,
    port: "80",
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn,
    }],
});




// const webAppInstance = new aws.ec2.Instance("webAppInstance", {
//     ami: ami,  
//     instanceType: instanceType, 
//     subnetId: publicSubnetIds[0],  
//     securityGroups: [ApplicationSecurityGroup.id],
//     keyName: keyName,
//     rootBlockDevice: {
//         volumeSize: volumeSize,  
//         volumeType: volumeType, 
//         deleteOnTermination:true,
//     },
//     disableApiTermination:false,
//     iamInstanceProfile: instanceProfile.name,
//     userDataReplaceOnChange:true,
//     userData:pulumi.interpolate`#!/bin/bash
//     cd /opt/csye6225
//     sudo rm .env
//     sudo touch .env
//     echo PGPORT=5432 >> /opt/csye6225/.env
//     echo PGUSER=${username} >> /opt/csye6225/.env
//     echo PGPASSWORD=${password} >> /opt/csye6225/.env
//     echo PGDATABASE=${dbName} >> /opt/csye6225/.env
//     echo CSVPATH=${userCSVPATH} >> /opt/csye6225/.env
//     echo PGHOST=${rdsDatabase.address} >> /opt/csye6225/.env
//     sudo systemctl restart webapp
//     sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
//     -a fetch-config \
//     -m ec2 \
//     -c file:/opt/csye6225/aws_cw_config.json \
//     -s
//     sudo systemctl enable amazon-cloudwatch-agent
//     sudo systemctl start amazon-cloudwatch-agent`,
//     dependsOn: [rdsDatabase],
//     tags: {
//         Name: "EC2 Web APP Pulumi",
//     },
// });




 

const asg = new aws.autoscaling.Group("asg", {
    name: "asg_launch_config",
    maxSize: 3,
    minSize: 1,
    desiredCapacity: 1,
    forceDelete: true,
    defaultCooldown: 60,
    vpcZoneIdentifiers: publicSubnetIds,
    instanceProfile: instanceProfile.name,

    tags: [
        {
            key: "Name",
            value: "csye6225_asg",
            propagateAtLaunch: true,
        },
    ],

    launchTemplate: {
        id: launchtemplate.id,
        version: "$Latest",
    },
    dependsOn: [targetGroup],
    targetGroupArns: [targetGroup.arn],
});



const scaleUpPolicy = new aws.autoscaling.Policy("scaleUpPolicy", {
    autoscalingGroupName: asg.name,
    scalingAdjustment: 1,
    cooldown: 60,
    adjustmentType: "ChangeInCapacity",
    autocreationCooldown: 60,
    cooldownDescription: "Scale up policy when average CPU usage is above 5%",
    policyType: "SimpleScaling",
    scalingTargetId: asg.id,
});

const scaleDownPolicy = new aws.autoscaling.Policy("scaleDownPolicy", {
    autoscalingGroupName: asg.name,
    scalingAdjustment: -1,
    cooldown: 60,
    adjustmentType: "ChangeInCapacity",
    autocreationCooldown: 60,
    cooldownDescription: "Scale down policy when average CPU usage is below 3%",
    policyType: "SimpleScaling",
    scalingTargetId: asg.id,
});


const cpuUtilizationAlarmHigh = new aws.cloudwatch.MetricAlarm("cpuUtilizationAlarmHigh", {
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 1,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 60,
    threshold: 5,
    statistic: "Average",
    alarmActions: [scaleUpPolicy.arn],
    dimensions: { AutoScalingGroupName: asg.name },
});

const cpuUtilizationAlarmLow = new aws.cloudwatch.MetricAlarm("cpuUtilizationAlarmLow", {
    comparisonOperator: "LessThanThreshold",
    evaluationPeriods: 1,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 60,
    statistic: "Average",
    threshold: 3,
    alarmActions: [scaleDownPolicy.arn],
    dimensions: { AutoScalingGroupName: asg.name },
});



const route53Record = new aws.route53.Record(`${domainName}-record`, {
    name: domainName, 
    type: "A",
    zoneId: zonedID, 
    aliases: [{
        name: loadbalncer.dnsName,
        zoneId: loadbalncer.zoneId,
        evaluateTargetHealth: true,
    }], 
   
});



    exports.vpcId = vpc.id;
    exports.publicSubnetIds = publicSubnetIds;
    exports.privateSubnetIds = privateSubnetIds;
    exports.internetGatewayId = internetGateway.id;
    exports.publicRouteTableId = publicRouteTable.id;
    exports.privateRouteTableId = privateRouteTable.id;
    exports.rdsDatabase=rdsDatabase.id;
    //exports.instanceId = webAppInstance.id;
    exports.route53Record=route53Record.id;
});
