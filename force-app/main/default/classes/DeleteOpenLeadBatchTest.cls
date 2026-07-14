@IsTest
private class DeleteOpenLeadBatchTest {

    @TestSetup
    static void setupTestData() {
        List<Lead> testLeads = new List<Lead>();
        for (Integer i = 0; i < 5; i++) {
            testLeads.add(new Lead(
                LastName = 'Test Lead ' + i,
                Company = 'Test Company ' + i,
                Status = 'Open - Not Contacted'
            ));
        }
        for (Integer i = 0; i < 3; i++) {
            testLeads.add(new Lead(
                LastName = 'Closed Lead ' + i,
                Company = 'Test Company ' + i,
                Status = 'Closed - Not Converted'
            ));
        }
        insert testLeads;
    }

    @IsTest
    static void testDeleteOpenLeads() {
        Test.startTest();

        DeleteOpenLeadBatch batch = new DeleteOpenLeadBatch();
        Id jobId = Database.executeBatch(batch, 200);

        Test.stopTest();

        List<Lead> openLeads = [SELECT Id FROM Lead WHERE Status LIKE 'Open%'];
        System.assertEquals(0, openLeads.size(), 'All open leads should be deleted');
    }

    @IsTest
    static void testRunMethod() {
        Test.startTest();

        Id jobId = DeleteOpenLeadBatch.run();

        Test.stopTest();

        System.assertNotEquals(null, jobId, 'JobId should not be null');
    }

    @IsTest
    static void testExecuteWithNoLeads() {
        delete [SELECT Id FROM Lead];

        Test.startTest();

        DeleteOpenLeadBatch batch = new DeleteOpenLeadBatch();
        Id jobId = Database.executeBatch(batch, 200);

        Test.stopTest();

        List<Lead> remainingLeads = [SELECT Id FROM Lead];
        System.assertEquals(0, remainingLeads.size(), 'No leads should exist');
    }
}