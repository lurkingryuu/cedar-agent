# Testing ABAC in MySQL

## Only ABAC RULES
### Root Commands
```sql
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 31
Server version: 8.0.27 Source distribution

Copyright (c) 2000, 2021, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> -- Setup database and tables
mysql> CREATE DATABASE IF NOT EXISTS abac_test;
Query OK, 1 row affected (0.05 sec)

mysql> USE abac_test;
Database changed
mysql>
mysql> CREATE TABLE IF NOT EXISTS employees (
    ->     id INT PRIMARY KEY,
    ->     name VARCHAR(100),
    ->     department VARCHAR(50)
    -> );
Query OK, 0 rows affected (0.03 sec)

mysql>
mysql> CREATE TABLE IF NOT EXISTS projects (
    ->     id INT PRIMARY KEY,
    ->     name VARCHAR(100),
    ->     classification VARCHAR(50)
    -> );
Query OK, 0 rows affected (0.02 sec)

mysql>
mysql> CREATE TABLE IF NOT EXISTS sensitiv_data (
    ->     id INT PRIMARY KEY,
    ->     info TEXT
    -> );
Query OK, 0 rows affected (0.04 sec)

mysql>
mysql> -- Create users
mysql> CREATE USER alice;
Query OK, 0 rows affected (0.02 sec)

mysql> CREATE USER bob;
Query OK, 0 rows affected (0.00 sec)

mysql> CREATE USER charlie;
Query OK, 0 rows affected (0.00 sec)

mysql>
mysql> -- Insert sample data
mysql> INSERT INTO employees (id, name, department) VALUES
    -> (1, 'Alice', 'IT'),
    -> (2, 'Bob', 'HR'),
    -> (3, 'Charlie', 'Finance');
Query OK, 3 rows affected (0.01 sec)
Records: 3  Duplicates: 0  Warnings: 0

mysql>
mysql> INSERT INTO projects (id, name, classification) VALUES
    -> (1, 'Project X', 'Top Secret'),
    -> (2, 'Project Y', 'Confidential'),
    -> (3, 'Project Z', 'Public');
Query OK, 3 rows affected (0.01 sec)
Records: 3  Duplicates: 0  Warnings: 0

mysql>
mysql> INSERT INTO sensitiv_data (id, info) VALUES
    -> (1, 'Sensitive information 1'),
    -> (2, 'Sensitive information 2'),
    -> (3, 'Sensitive information 3');
Query OK, 3 rows affected (0.01 sec)
Records: 3  Duplicates: 0  Warnings: 0

mysql>
mysql> -- Set up ABAC
mysql> CREATE USER ATTRIBUTE user_role;
Query OK, 0 rows affected (0.05 sec)

mysql> CREATE USER ATTRIBUTE clearance_level;
Query OK, 0 rows affected (0.00 sec)

mysql> CREATE RESOURCE ATTRIBUTE data_classification;
Query OK, 0 rows affected (0.01 sec)

mysql>
mysql> -- Assign user attributes
mysql> GRANT USER ATTRIBUTE user_role:manager TO alice;
Query OK, 0 rows affected (0.00 sec)

mysql> GRANT USER ATTRIBUTE user_role:employee TO bob;
Query OK, 0 rows affected (0.01 sec)

mysql> GRANT USER ATTRIBUTE user_role:intern TO charlie;
Query OK, 0 rows affected (0.00 sec)

mysql>
mysql> GRANT USER ATTRIBUTE clearance_level:top_secret TO alice;
Query OK, 0 rows affected (0.00 sec)

mysql> GRANT USER ATTRIBUTE clearance_level:confidential TO bob;
Query OK, 0 rows affected (0.00 sec)

mysql> GRANT USER ATTRIBUTE clearance_level:public TO charlie;
Query OK, 0 rows affected (0.01 sec)

mysql>
mysql> -- Assign resource attributes
mysql> GRANT RESOURCE ATTRIBUTE data_classification:public TO abac_test.employees;
Query OK, 0 rows affected (0.00 sec)

mysql> GRANT RESOURCE ATTRIBUTE data_classification:priv TO abac_test.projects;
Query OK, 0 rows affected (0.01 sec)

mysql> GRANT RESOURCE ATTRIBUTE data_classification:sensitiv TO abac_test.sensitiv_data;
Query OK, 0 rows affected (0.01 sec)

mysql> use mysql
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

mysql> select * from user_attrib_val;
+---------+------+-----------------+------------+
| User    | Host | Attrib_name     | Attrib_val |
+---------+------+-----------------+------------+
| alice   | %    | clearance_level | top_secret |
| alice   | %    | user_role       | manager    |
| bob     | %    | clearance_level | confidenti |
| bob     | %    | user_role       | employee   |
| charlie | %    | clearance_level | public     |
| charlie | %    | user_role       | intern     |
| karthik | %    | position        | admin      |
+---------+------+-----------------+------------+
7 rows in set (0.01 sec)

mysql> select * from object_attrib_val;
+-----------+---------------+---------------------+------------+
| Db_name   | Table_name    | Attrib_name         | Attrib_val |
+-----------+---------------+---------------------+------------+
| abac_test | employees     | data_classification | public     |
| abac_test | projects      | data_classification | priv       |
| abac_test | sensitiv_data | data_classification | sensitiv   |
| mydb      | mytableabac   | access_level        | secret     |
+-----------+---------------+---------------------+------------+
4 rows in set (0.04 sec)

mysql> select * from policy;
+----------------------+-------------+-------------+-------------+-------------+
| Rule_name            | Select_priv | Insert_priv | Update_priv | Delete_priv |
+----------------------+-------------+-------------+-------------+-------------+
| abac_rule            | Y           | N           | N           | N           |
+----------------------+-------------+-------------+-------------+-------------+
2 rows in set (0.01 sec)

mysql> select * from policy_object_aval;
+-----------+--------------------+-------------------+
| Rule_name | Object_attrib_name | Object_attrib_val |
+-----------+--------------------+-------------------+
| abac_rule | access_level       | secret            |
+-----------+--------------------+-------------------+
1 row in set (0.01 sec)

mysql> select * from policy_user_aval;
+-----------+------------------+-----------------+
| Rule_name | User_attrib_name | User_attrib_val |
+-----------+------------------+-----------------+
| abac_rule | position         | admin           |
+-----------+------------------+-----------------+
1 row in set (0.00 sec)

mysql> select * from object_attrib_val;
+-----------+---------------+---------------------+------------+
| Db_name   | Table_name    | Attrib_name         | Attrib_val |
+-----------+---------------+---------------------+------------+
| abac_test | employees     | data_classification | public     |
| abac_test | projects      | data_classification | priv       |
| abac_test | sensitiv_data | data_classification | sensitiv   |
| mydb      | mytableabac   | access_level        | secret     |
+-----------+---------------+---------------------+------------+
4 rows in set (0.21 sec)

mysql> CREATE RULE manager_access FOR SELECT OF USER ATTRIBUTE (user_role:manager) AND RESOURCE ATTRIBUTE (data_classification:sensitiv);
Query OK, 0 rows affected (0.04 sec)

mysql> CREATE RULE employee_access FOR SELECT, INSERT, UPDATE, DELETE OF USER ATTRIBUTE (user_role:employee) AND RESOURCE ATTRIBUTE (data_classification:priv);
Query OK, 0 rows affected (0.02 sec)

mysql> CREATE RULE intern_access FOR SELECT OF USER ATTRIBUTE (user_role:intern) AND RESOURCE ATTRIBUTE (data_classification:public);
Query OK, 0 rows affected (0.03 sec)

mysql> select * from policy;
+-----------------+-------------+-------------+-------------+-------------+
| Rule_name       | Select_priv | Insert_priv | Update_priv | Delete_priv |
+-----------------+-------------+-------------+-------------+-------------+
| abac_rule       | Y           | N           | N           | N           |
| employee_access | Y           | Y           | Y           | Y           |
| intern_access   | Y           | N           | N           | N           |
| manager_access  | Y           | N           | N           | N           |
+-----------------+-------------+-------------+-------------+-------------+
4 rows in set (0.18 sec)

mysql> select * from policy_
policy_object_aval                     policy_object_aval.Rule_name           policy_user_aval.User_attrib_name
policy_object_aval.Object_attrib_name  policy_user_aval                       policy_user_aval.User_attrib_val
policy_object_aval.Object_attrib_val   policy_user_aval.Rule_name
mysql> select * from policy_user_aval;
+-----------------+------------------+-----------------+
| Rule_name       | User_attrib_name | User_attrib_val |
+-----------------+------------------+-----------------+
| abac_rule       | position         | admin           |
| employee_access | user_role        | employee        |
| intern_access   | user_role        | intern          |
| manager_access  | user_role        | manager         |
+-----------------+------------------+-----------------+
4 rows in set (0.00 sec)

mysql> select * from policy_object_aval
    -> ;
+-----------------+---------------------+-------------------+
| Rule_name       | Object_attrib_name  | Object_attrib_val |
+-----------------+---------------------+-------------------+
| abac_rule       | access_level        | secret            |
| employee_access | data_classification | priv              |
| intern_access   | data_classification | public            |
| manager_access  | data_classification | sensitiv          |
+-----------------+---------------------+-------------------+
4 rows in set (0.00 sec)

mysql> CREATE RULE sensitiv_data_access FOR SELECT OF USER ATTRIBUTE (clearance_level:top_secret) AND RESOURCE ATTRIBUTE (data_classification:sensitiv);
Query OK, 0 rows affected (0.05 sec)

mysql> select * from policy;
+----------------------+-------------+-------------+-------------+-------------+
| Rule_name            | Select_priv | Insert_priv | Update_priv | Delete_priv |
+----------------------+-------------+-------------+-------------+-------------+
| abac_rule            | Y           | N           | N           | N           |
| employee_access      | Y           | Y           | Y           | Y           |
| intern_access        | Y           | N           | N           | N           |
| manager_access       | Y           | N           | N           | N           |
| sensitiv_data_access | Y           | N           | N           | N           |
+----------------------+-------------+-------------+-------------+-------------+
5 rows in set (0.00 sec)

mysql> select * from policy_user_aval;
+----------------------+------------------+-----------------+
| Rule_name            | User_attrib_name | User_attrib_val |
+----------------------+------------------+-----------------+
| abac_rule            | position         | admin           |
| employee_access      | user_role        | employee        |
| intern_access        | user_role        | intern          |
| manager_access       | user_role        | manager         |
| sensitiv_data_access | clearance_level  | top_secret      |
+----------------------+------------------+-----------------+
5 rows in set (0.00 sec)

mysql> select * from policy_object_aval;
+----------------------+---------------------+-------------------+
| Rule_name            | Object_attrib_name  | Object_attrib_val |
+----------------------+---------------------+-------------------+
| abac_rule            | access_level        | secret            |
| employee_access      | data_classification | priv              |
| intern_access        | data_classification | public            |
| manager_access       | data_classification | sensitiv          |
| sensitiv_data_access | data_classification | sensitiv          |
+----------------------+---------------------+-------------------+
5 rows in set (0.00 sec)

```

### User alice
```sql
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 35
Server version: 8.0.27 Source distribution

Copyright (c) 2000, 2021, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> USE abac_test;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
mysql> SELECT * FROM sensitiv_data; -- Before RULE is defined in the root
ERROR 1142 (42000): SELECT command denied to user 'alice'@'localhost' for table 'sensitiv_data'
mysql> USE abac_test; -- Before RULE is defined in the root
ERROR 1044 (42000): Access denied for user 'alice'@'%' to database 'abac_test'
mysql> USE abac_test; -- After RULE is defined in the root
Database changed
mysql> SELECT * FROM sensitiv_data; -- After RULE is defined in the root
+----+-------------------------+
| id | info                    |
+----+-------------------------+
|  1 | Sensitive information 1 |
|  2 | Sensitive information 2 |
|  3 | Sensitive information 3 |
+----+-------------------------+
3 rows in set (0.00 sec)

mysql> SHOW TABLES; -- After RULE is defined in the root
+---------------------+
| Tables_in_abac_test |
+---------------------+
| sensitiv_data       |
+---------------------+
1 row in set (0.02 sec)
```

### User bob
```sql
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 36
Server version: 8.0.27 Source distribution

Copyright (c) 2000, 2021, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> USE abac_test; -- Before RULE is defined in the root
ERROR 1044 (42000): Access denied for user 'bob'@'%' to database 'abac_test'
mysql> USE abac_test; -- After RULE is defined in the root
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
mysql> SHOW TABLES; -- After RULE is defined in the root
+---------------------+
| Tables_in_abac_test |
+---------------------+
| projects            |
+---------------------+
1 row in set (0.00 sec)

mysql> select * from projects; -- After RULE is defined in the root
+----+-----------+----------------+
| id | name      | classification |
+----+-----------+----------------+
|  1 | Project X | Top Secret     |
|  2 | Project Y | Confidential   |
|  3 | Project Z | Public         |
+----+-----------+----------------+
3 rows in set (0.01 sec)

mysql> UPDATE projects SET name='ProjectX' WHERE id=1; -- After RULE is defined in the root
Query OK, 1 row affected (0.10 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> select * from projects; -- After RULE is defined in the root
+----+-----------+----------------+
| id | name      | classification |
+----+-----------+----------------+
|  1 | ProjectX  | Top Secret     |
|  2 | Project Y | Confidential   |
|  3 | Project Z | Public         |
+----+-----------+----------------+
3 rows in set (0.00 sec)

mysql> UPDATE projects SET name='Project X' WHERE id=1; -- After RULE is defined in the root
Query OK, 1 row affected (0.02 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> select * from projects; -- After RULE is defined in the root
+----+-----------+----------------+
| id | name      | classification |
+----+-----------+----------------+
|  1 | Project X | Top Secret     |
|  2 | Project Y | Confidential   |
|  3 | Project Z | Public         |
+----+-----------+----------------+
3 rows in set (0.00 sec)
```

### User charlie
```sql
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 37
Server version: 8.0.27 Source distribution

Copyright (c) 2000, 2021, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> USE abac_test; -- Before RULE is defined in the root
ERROR 1044 (42000): Access denied for user 'charlie'@'%' to database 'abac_test'
mysql> USE abac_test; -- After RULE is defined in the root
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
mysql> SHOW TABLES; -- After RULE is defined in the root
+---------------------+
| Tables_in_abac_test |
+---------------------+
| employees           |
+---------------------+
1 row in set (0.00 sec)

mysql> select * from employees; -- After RULE is defined in the root
+----+---------+------------+
| id | name    | department |
+----+---------+------------+
|  1 | Alice   | IT         |
|  2 | Bob     | HR         |
|  3 | Charlie | Finance    |
+----+---------+------------+
3 rows in set (0.00 sec)
```

