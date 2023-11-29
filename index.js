const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const gcp =require("@pulumi/gcp");
const { rds } = require("@pulumi/aws/types/enums");
const { TargetGroup } = require("@pulumi/aws/alb");
const config = new pulumi.Config();


const cidrblock=config.require("cidr");
 const region=config.require("region");
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
const emailId=config.require('emailId');





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
            cidrBlocks: ["0.0.0.0/0"],
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


let policyAttachmentcloudwatch = new aws.iam.RolePolicyAttachment("policyAttachment", {
role: role.name,
policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy" 
})

const lambdaFullAccessAttachment_ec2 = new aws.iam.RolePolicyAttachment("lambdaPolicy-LambdaFullAccess_ec2", {
    role: role.name,
    policyArn:  "arn:aws:iam::aws:policy/AWSLambda_FullAccess",
});

const dynamoDBFullAccessAttachment_ec2 = new aws.iam.RolePolicyAttachment("lambdaPolicy-DynamoDBFullAccess_ec2", {
    role: role.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
});


let instanceProfile = new aws.iam.InstanceProfile("myInstanceProfile", {
role: role.name
});

const db = new aws.dynamodb.Table("csye-6225", {
    name:"csye-6225",
    attributes: [  
        { name: "timestamp", type: "S" },  
    ],
    hashKey: "timestamp",
    readCapacity: 1,
    writeCapacity: 1,
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








const topic = new aws.sns.Topic("sending-email", {
    displayName: "sending-email",
});


const lambdaRole = new aws.iam.Role("LambdaFunctionRole", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: {
                Service: ["lambda.amazonaws.com"],
            },
            Action: ["sts:AssumeRole"],
        }],
    }),
});


const lambdaPolicyArns = [
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
    "arn:aws:iam::aws:policy/AWSLambda_FullAccess",
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
  
];


const cloudWatchLogsAttachment = new aws.iam.RolePolicyAttachment("lambdaPolicy-CloudWatchLogs", {
    role: lambdaRole.name,
    policyArn: lambdaPolicyArns[0],
});



const lambdaFullAccessAttachment = new aws.iam.RolePolicyAttachment("lambdaPolicy-LambdaFullAccess", {
    role: lambdaRole.name,
    policyArn: lambdaPolicyArns[1],
});

const dynamoDBFullAccessAttachment = new aws.iam.RolePolicyAttachment("lambdaPolicy-DynamoDBFullAccess", {
    role: lambdaRole.name,
    policyArn: lambdaPolicyArns[2],
});


const topicPolicy = new aws.iam.Policy("EC2TopicAccessPolicy", {
    policy: {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "AllowEC2ToPublishToSNSTopic",
                Effect: "Allow",
                Action: ["sns:Publish", "sns:CreateTopic"],
                Resource: topic.arn,
            },
        ],
    },
    roles: [lambdaRole],
});

const topicPolicy1 = new aws.iam.Policy("EC2TopicAccessPolic", {
    policy: {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "AllowEC2ToPublishToSNSTopic",
                Effect: "Allow",
                Action: ["sns:Publish", "sns:CreateTopic"],
                Resource: topic.arn,
            },
        ],
    },
    roles: [role],
});

const snsPublishPolicyAttachment = new aws.iam.RolePolicyAttachment("SNSPublishPolicyAttachment", {
    role: role.name,
    policyArn: topicPolicy1.arn,
});

// const lambdaCode = new aws.s3.BucketObject("lambda-code", {
//     bucket: "sumeet-bucket1",
//     key: "Archive.zip", 
// });


const gcsBucket = new gcp.storage.Bucket("gcsBucket", {
    name: "csye6225_demo_sumeet_gcs_bucket",
    forceDestroy: true,
    location: "us",
    versioning: {                   
        enabled: true,
    },
});

const serviceAccount = new gcp.serviceaccount.Account("myServiceAccount", {
    accountId: "gcp-bucket-service-account",
    displayName: "GCP Bucket Service Account",
});



const bucketAccess = new gcp.storage.BucketIAMBinding("bucketAccess", {
    bucket: gcsBucket.name,
    role: "roles/storage.objectAdmin",
    members: [pulumi.interpolate`serviceAccount:${serviceAccount.email}`],
});

const serviceAccountKeys = new gcp.serviceaccount.Key("myServiceAccountKeys", {
    serviceAccountId: serviceAccount.id,
});
console.log("@!@!@!@!@!@!@!@!@!@!@@!@@#!#",serviceAccountKeys.privateKey);

const keyFilePath = pulumi.interpolate`./${serviceAccountKeys.name}.json`;

const keyFileContentOutput = serviceAccountKeys.privateKeyJson;

keyFilePath.apply(path => {
    pulumi.log.info(`Key File Path: ${path}`);
});




const apiKey=config.require('apiKey');
const projectId=config.require('projectId');
const serverlesspath=config.require('serverlesspath');

const lambdaFunction = new aws.lambda.Function("LambdaFunction", {
    functionName: "sendemail",
    role: lambdaRole.arn,
    runtime: "nodejs18.x", 
    handler: "index.handler",
    code:  new pulumi.asset.FileArchive(serverlesspath),
    environment: {
        variables: {
            gcp_name: serviceAccountKeys.name,
            gcp_pk: serviceAccountKeys.privateKey,
            gcsBucket: gcsBucket.name,
            dbName:db.name,
            projectId:projectId,
            apiKey:apiKey,
            emailId:emailId,
        },
    },
});

const snsSubscription = new aws.sns.TopicSubscription(`SNSSubscription`, {
    topic: topic.arn,
    protocol: "lambda",
    endpoint: lambdaFunction.arn,
});


const topicPolicyAttachment = new aws.iam.PolicyAttachment("topicPolicyAttachment", {
    policyArn: topicPolicy.arn,
    roles: [lambdaRole.name],
});

const lambdaPermission = new aws.lambda.Permission("with_sns", {
    statementId: "AllowExecutionFromSNS",
    action: "lambda:InvokeFunction",
    function: lambdaFunction.name,
    principal: "sns.amazonaws.com",
    sourceArn: topic.arn,
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
echo DYNAMODB=${db.name} >> /opt/csye6225/.env
echo topicARN=${topic.arn} >> /opt/csye6225/.env
sudo systemctl restart webapp
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
-a fetch-config \
-m ec2 \
-c file:/opt/csye6225/aws_cw_config.json \
-s
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent`;




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
