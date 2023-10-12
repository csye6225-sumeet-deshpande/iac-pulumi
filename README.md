# Project Name
This repo contains code for Infra as a part of csye6225

## AWS Command Line Interface (CLI)

1. **Install AWS CLI** :computer:  
   Follow the [official AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) to install AWS CLI on your development machine.

2. **Configure AWS CLI Profiles** :gear:  
   Create profiles for your development and demo AWS accounts using `aws configure`. Specify the `--profile` flag.

    ```bash
    aws configure --profile dev
    aws configure --profile demo
    ```

3. **Set AWS Region for Profiles** :earth_americas:  
   Define the AWS region for each profile using `aws configure set`.

    ```bash
    aws configure set region us-west-2 --profile dev
    aws configure set region us-east-1 --profile demo
    ```

## Networking Infrastructure with AWS

1. **Create a VPC** :cloud:  
   Use the AWS CLI to create a Virtual Private Cloud (VPC). Replace the CIDR block with your desired range.


2. **Create Subnets** :electric_plug:  
   Create 3 public and 3 private subnets in different availability zones within the VPC .

3. **Internet Gateway** :globe_with_meridians:  
   Create an Internet Gateway and attach it to the VPC.


4. **Route Tables** :arrows_counterclockwise:  
   Create public and private route tables .

5. **Configure Routes** :arrow_up:  
   Add a default route (0.0.0.0/0) to the public route table pointing to the Internet Gateway.

6. **Subnet Associations** :chains:  
   Associate the subnets with their respective route tables using .

## Infrastructure as Code with Pulumi

1. **Install Pulumi CLI** :hammer:  
   Install Pulumi CLI by following the [Pulumi installation guide](https://www.pulumi.com/docs/get-started/install/).

2. **Initialize Pulumi Project** :building_construction:  

    ```bash
    pulumi new aws-javascript
    ```

3. **Write Infrastructure Code** :pencil:  
   Write infrastructure code in TypeScript (or your preferred language) to create VPC, subnets, route tables, and other resources. Avoid hardcoding values.

4. **Deploy Infrastructure** :rocket:

    ```bash
    pulumi up
    ```

