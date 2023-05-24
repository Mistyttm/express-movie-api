# Assignment 3 CAB230

## How to access and use MariaDB through Docker

 - Connect:
    ```powershell
    docker exec -it [CONTAINER NAME] mariadb --user root -p[PASSWORD HERE]
    ```
 - Export:
    ```powershell
    docker exec [CONTAINER NAME] mysqldump --user root --password=[PASSWORD HERE] [DB NAME HERE] > [PATH TO DUMP]
    ```
 - Import:
    ```powershell
    cmd /c 'docker exec -i [CONTAINER NAME] mysql --user root --password=[PASSWORD HERE] [DB NAME] < [PATH TO DUMP FILE]'
    ```
 - password: `8Q4a%jEI1uc#EaDf`